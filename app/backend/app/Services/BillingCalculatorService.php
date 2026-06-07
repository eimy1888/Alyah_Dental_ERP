<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceProjection;
use App\Models\Procedure;
use App\Models\PricingRule;
use App\Models\Service;
use App\Models\TreatmentEpisode;
use App\Models\BillingEvent;
use App\Models\User;

/**
 * BillingCalculatorService — the Pricing Rule Engine.
 *
 * Procedures NEVER write directly to invoices.
 * This service sits between clinical actions and invoices:
 *
 *   Clinical action (Procedure/Material/Lab)
 *     → createProjectionLine()        — stores pending line
 *     → applyPricingRules()           — computes final price
 *     → commitProjectionToInvoice()   — writes to invoice_items
 *     → BillingEvent logged
 *
 * This decoupling allows:
 *   - Insurance recalculation without touching committed items
 *   - Discount rules applied cleanly
 *   - Tax rule changes reflected transparently
 *   - Price override audit trail
 *   - Re-projection when pricing rules change
 */
class BillingCalculatorService
{
    /**
     * Full pipeline: create projection line, apply rules, commit to invoice.
     * Returns the committed InvoiceItem.
     */
    public function processProcedure(
        Procedure        $procedure,
        TreatmentEpisode $episode,
        Invoice          $invoice,
        User             $addedBy
    ): array {
        $service = $procedure->service;
        if (!$service) {
            return ['success' => false, 'message' => 'Service not found on procedure.'];
        }

        $previousTotal = (float) $invoice->total;

        // 1. Compute final price through pricing rule engine
        $pricing = $this->computePrice(
            basePrice:  (float) $service->price,
            quantity:   1,
            clinicId:   $episode->clinic_id,
            branchId:   $episode->branch_id,
            serviceId:  $service->id,
            dentistId:  $episode->dentist_id,
            insuranceProvider: $episode->appointment?->patient?->insurance_provider
        );

        // 2. Create projection line
        $projection = InvoiceProjection::create([
            'clinic_id'            => $episode->clinic_id,
            'branch_id'            => $episode->branch_id,
            'treatment_episode_id' => $episode->id,
            'invoice_id'           => $invoice->id,
            'source_type'          => Procedure::class,
            'source_id'            => $procedure->id,
            'description'          => $this->buildDescription($procedure),
            'quantity'             => 1,
            'base_unit_price'      => (float) $service->price,
            'modifier_applied'     => $pricing['modifier_applied'],
            'final_unit_price'     => $pricing['final_unit_price'],
            'line_total'           => $pricing['line_total'],
            'applied_rules'        => $pricing['applied_rule_ids'],
            'insurance_coverage'   => $pricing['insurance_coverage'],
            'patient_liability'    => $pricing['patient_liability'],
            'discount_amount'      => $pricing['discount_amount'],
            'status'               => InvoiceProjection::STATUS_PENDING,
            'added_by'             => $addedBy->id,
        ]);

        // 3. Commit projection to invoice item
        $invoiceItem = $this->commitProjection($projection, $invoice, $addedBy);

        // 4. Update procedure with invoice item link
        $procedure->update(['invoice_item_id' => $invoiceItem->id]);

        // 5. Recalculate invoice totals
        $invoice->recalculate();
        $invoice->refresh();

        // 6. Log billing event
        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_PROCEDURE_ADDED,
            $pricing['line_total'],
            (float) $invoice->total,
            [
                'procedure_id'    => $procedure->id,
                'service_name'    => $service->name,
                'base_price'      => (float) $service->price,
                'final_price'     => $pricing['final_unit_price'],
                'applied_rules'   => $pricing['applied_rule_ids'],
                'insurance'       => $pricing['insurance_coverage'],
                'projection_id'   => $projection->id,
            ],
            $addedBy->id,
            $episode->appointment_id,
            $episode->id
        );

        return [
            'success'        => true,
            'projection'     => $projection,
            'invoice_item'   => $invoiceItem,
            'pricing'        => $pricing,
            'invoice_impact' => [
                'previous_total'   => $previousTotal,
                'added_amount'     => $pricing['line_total'],
                'new_total'        => (float) $invoice->total,
                'lifecycle_status' => $invoice->lifecycle_status,
                'message'          => "Invoice updated: +ETB " . number_format($pricing['line_total'], 2),
            ],
        ];
    }

    /**
     * Remove a procedure from the invoice.
     * Marks projection as removed, deletes invoice item, recalculates.
     */
    public function removeProcedure(
        Procedure $procedure,
        Invoice   $invoice,
        User      $removedBy
    ): array {
        if (!$invoice->isEditable()) {
            return ['success' => false, 'message' => 'Invoice is locked. Cannot remove procedures.'];
        }

        $previousTotal = (float) $invoice->total;
        $removedAmount = 0;

        // Mark projection as removed
        $projection = InvoiceProjection::where('source_type', Procedure::class)
            ->where('source_id', $procedure->id)
            ->where('invoice_id', $invoice->id)
            ->first();

        if ($projection) {
            $removedAmount = (float) $projection->line_total;
            $projection->update(['status' => InvoiceProjection::STATUS_REMOVED]);
        }

        // Delete invoice item
        if ($procedure->invoice_item_id) {
            InvoiceItem::find($procedure->invoice_item_id)?->delete();
        }

        // Recalculate
        $invoice->recalculate();
        $invoice->refresh();

        BillingEvent::log(
            $invoice,
            BillingEvent::EVENT_PROCEDURE_REMOVED,
            -$removedAmount,
            (float) $invoice->total,
            ['procedure_id' => $procedure->id, 'removed_by' => $removedBy->name],
            $removedBy->id,
            $invoice->appointment_id
        );

        return [
            'success'        => true,
            'removed_amount' => $removedAmount,
            'invoice_impact' => [
                'previous_total' => $previousTotal,
                'removed_amount' => $removedAmount,
                'new_total'      => (float) $invoice->total,
            ],
        ];
    }

    /**
     * Re-project all pending lines for an episode.
     * Used when pricing rules change or insurance is updated.
     */
    public function reprojectEpisode(TreatmentEpisode $episode, User $by): void
    {
        $pendingProjections = $episode->projections()
            ->where('status', InvoiceProjection::STATUS_COMMITTED)
            ->where('source_type', Procedure::class)
            ->get();

        foreach ($pendingProjections as $projection) {
            $procedure = Procedure::find($projection->source_id);
            if (!$procedure?->service) continue;

            $pricing = $this->computePrice(
                basePrice:  (float) $procedure->service->price,
                quantity:   (float) $projection->quantity,
                clinicId:   $episode->clinic_id,
                branchId:   $episode->branch_id,
                serviceId:  $procedure->service_id,
                dentistId:  $episode->dentist_id,
                insuranceProvider: $episode->appointment?->patient?->insurance_provider
            );

            $projection->update([
                'modifier_applied'   => $pricing['modifier_applied'],
                'final_unit_price'   => $pricing['final_unit_price'],
                'line_total'         => $pricing['line_total'],
                'applied_rules'      => $pricing['applied_rule_ids'],
                'insurance_coverage' => $pricing['insurance_coverage'],
                'patient_liability'  => $pricing['patient_liability'],
                'status'             => InvoiceProjection::STATUS_REVISED,
            ]);

            // Update invoice item
            if ($projection->invoice_item_id) {
                InvoiceItem::where('id', $projection->invoice_item_id)->update([
                    'unit_price'         => $pricing['final_unit_price'],
                    'insurance_coverage' => $pricing['insurance_coverage'],
                ]);
            }
        }

        $episode->invoice?->recalculate();
    }

    // ── Core Pricing Engine ───────────────────────────────────────────────────

    /**
     * Compute final price by applying all matching PricingRules in priority order.
     *
     * Pipeline:
     *   base → branch → doctor → insurance → urgency → promotion → override
     */
    public function computePrice(
        float   $basePrice,
        float   $quantity        = 1,
        int     $clinicId        = 0,
        ?int    $branchId        = null,
        ?int    $serviceId       = null,
        ?int    $dentistId       = null,
        ?string $insuranceProvider = null
    ): array {
        $rules = PricingRule::active()
            ->forClinic($clinicId)
            ->forService($serviceId ?? 0)
            ->forBranch($branchId)
            ->forDentist($dentistId)
            ->orderByRaw('FIELD(rule_type, "base","branch","doctor","insurance","urgency","promotion","override")')
            ->orderBy('priority')
            ->get();

        $currentPrice    = $basePrice;
        $insuranceCoverage = 0;
        $discountAmount  = 0;
        $appliedRuleIds  = [];
        $modifierApplied = 0;

        foreach ($rules as $rule) {
            // Insurance rule: compute coverage separately, don't touch price
            if ($rule->rule_type === PricingRule::TYPE_INSURANCE) {
                if (!$insuranceProvider
                    || ($rule->insurance_provider && $rule->insurance_provider !== $insuranceProvider)) {
                    continue;
                }
                $lineTotal         = $currentPrice * $quantity;
                $insuranceCoverage = $rule->computeCoverage($lineTotal);
                $appliedRuleIds[]  = $rule->id;
                continue;
            }

            // Promotion / discount rules — track separately for display
            if ($rule->rule_type === PricingRule::TYPE_PROMOTION) {
                $reduced        = $rule->applyTo($currentPrice);
                $discountAmount += ($currentPrice - $reduced) * $quantity;
                $currentPrice   = $reduced;
                $appliedRuleIds[] = $rule->id;
                continue;
            }

            // All other rules modify price
            $newPrice        = $rule->applyTo($currentPrice);
            $modifierApplied += ($newPrice - $currentPrice);
            $currentPrice    = $newPrice;
            $appliedRuleIds[] = $rule->id;
        }

        $lineTotal        = round($currentPrice * $quantity, 2);
        $patientLiability = max(0, $lineTotal - $insuranceCoverage);

        return [
            'base_unit_price'    => $basePrice,
            'modifier_applied'   => round($modifierApplied, 2),
            'final_unit_price'   => round($currentPrice, 2),
            'quantity'           => $quantity,
            'line_total'         => $lineTotal,
            'insurance_coverage' => round($insuranceCoverage, 2),
            'patient_liability'  => round($patientLiability, 2),
            'discount_amount'    => round($discountAmount, 2),
            'applied_rule_ids'   => $appliedRuleIds,
        ];
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function commitProjection(
        InvoiceProjection $projection,
        Invoice           $invoice,
        User              $addedBy
    ): InvoiceItem {
        $item = InvoiceItem::create([
            'invoice_id'         => $invoice->id,
            'description'        => $projection->description,
            'quantity'           => $projection->quantity,
            'unit_price'         => $projection->final_unit_price,
            'total'              => $projection->line_total,
            'item_type'          => InvoiceItem::TYPE_PROCEDURE,
            'source_type'        => $projection->source_type,
            'source_id'          => $projection->source_id,
            'projection_id'      => $projection->id,
            'added_by'           => $addedBy->id,
            'is_locked'          => false,
            'discount'           => $projection->discount_amount,
            'insurance_coverage' => $projection->insurance_coverage,
        ]);

        $projection->update([
            'status'         => InvoiceProjection::STATUS_COMMITTED,
            'committed_at'   => now(),
            'invoice_item_id'=> $item->id,
        ]);

        return $item;
    }

    private function buildDescription(Procedure $procedure): string
    {
        $desc = $procedure->name;
        if ($procedure->tooth_number) $desc .= " (Tooth #{$procedure->tooth_number})";
        if ($procedure->tooth_surface) $desc .= " [{$procedure->tooth_surface}]";
        if ($procedure->notes)         $desc .= " — {$procedure->notes}";
        return $desc;
    }
}
