<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\PricingRule;
use App\Models\Service;
use Illuminate\Database\Seeder;

/**
 * BillingV2Seeder — seeds default pricing rules and updates services
 * with billing_model so the dual billing system works out of the box.
 *
 * Run: php artisan db:seed --class=BillingV2Seeder
 * Or add to DatabaseSeeder after PatientSeeder.
 */
class BillingV2Seeder extends Seeder
{
    public function run(): void
    {
        $clinic = Clinic::where('name', 'Nile Smile Specialty Dental')->first();
        if (!$clinic) {
            $this->command->warn('Clinic not found. Run DemoClinicSeeder first.');
            return;
        }

        $this->command->info('Seeding Billing v2 data...');

        // ── 1. Set billing_model on existing services ─────────────────────────
        $serviceModels = [
            // Fixed price — invoice created at booking
            'Consultation'   => 'service',
            'Whitening'      => 'service',
            'X-Ray'          => 'service',
            'Emergency'      => 'service',
            // Treatment — dynamic invoice built by dentist
            'Root Canal'     => 'treatment',
            'Implant'        => 'treatment',
            'Orthodontics'   => 'treatment',
            'Surgery'        => 'treatment',
        ];

        foreach ($serviceModels as $name => $model) {
            Service::where('clinic_id', $clinic->id)
                ->where('name', 'like', "%{$name}%")
                ->update([
                    'billing_model'               => $model,
                    'generate_invoice_at_booking' => $model === 'service',
                    'allow_prepayment'            => true,
                ]);
        }

        // Default: all remaining services → service billing model
        Service::where('clinic_id', $clinic->id)
            ->whereNull('billing_model')
            ->update(['billing_model' => 'service', 'generate_invoice_at_booking' => true]);

        $this->command->info('  ✓ Services updated with billing_model');

        // ── 2. Default urgency surcharge (emergency appointments +20%) ────────
        PricingRule::firstOrCreate(
            [
                'clinic_id'   => $clinic->id,
                'rule_type'   => PricingRule::TYPE_URGENCY,
                'branch_id'   => null,
                'service_id'  => null,
                'dentist_id'  => null,
            ],
            [
                'modifier_type' => PricingRule::MOD_PERCENTAGE,
                'value'         => 20,
                'min_price'     => null,
                'max_price'     => null,
                'priority'      => 5,
                'is_active'     => false, // disabled by default — enable per clinic
                'notes'         => 'Emergency/urgency surcharge +20%. Enable when needed.',
            ]
        );

        // ── 3. Example insurance rule (Ethiopian Insurance Corp — 80% coverage) ─
        PricingRule::firstOrCreate(
            [
                'clinic_id'          => $clinic->id,
                'rule_type'          => PricingRule::TYPE_INSURANCE,
                'insurance_provider' => 'Ethiopian Insurance Corporation',
                'branch_id'          => null,
                'service_id'         => null,
                'dentist_id'         => null,
            ],
            [
                'modifier_type'       => PricingRule::MOD_PERCENTAGE,
                'value'               => 0,
                'coverage_percentage' => 80.00,
                'priority'            => 4,
                'is_active'           => false, // enable when insurance contract is active
                'notes'               => 'EIC covers 80% of procedure cost.',
            ]
        );

        $this->command->info('  ✓ Default pricing rules created (disabled by default)');
        $this->command->info('  ℹ Enable rules via /clinic/settings/pricing-rules when ready');
        $this->command->info('');
        $this->command->info('✅ BillingV2Seeder complete.');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('Next steps:');
        $this->command->info('  1. php artisan migrate (run new v2 migrations)');
        $this->command->info('  2. php artisan billing:backfill (backfill existing data)');
        $this->command->info('  3. php artisan db:seed --class=BillingV2Seeder (seed rules)');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}
