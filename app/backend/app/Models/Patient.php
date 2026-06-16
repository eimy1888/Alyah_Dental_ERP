<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'user_id',
        'created_by',
        'first_name',
        'last_name',
        'phone',
        'email',
        'date_of_birth',
        'gender',
        'city',
        'address',
        'insurance_provider',
        'insurance_number',
        'medical_cases',
        'other_conditions',
        'status',
        'no_show_count',
        'requires_deposit',
        'is_blocked',
        'medical_alerts',
        'vip',
        'card_number',
        'has_card',
        'card_is_active',
        'last_no_show_at',
        // REQ-15: Debt tracking for emergency non-payers
        'has_debt',
        'debt_amount',
        'debt_invoice_id',
        'debt_flagged_at',
        'debt_flagged_by',
    ];

    protected $casts = [
        'date_of_birth'   => 'date',
        'status'          => 'string',
        'medical_cases'   => 'array',
        'requires_deposit'=> 'boolean',
        'is_blocked'      => 'boolean',
        'vip'             => 'boolean',
        'has_card'        => 'boolean',
        'card_is_active'  => 'boolean',
        'has_debt'        => 'boolean',
        'debt_amount'     => 'decimal:2',
        'last_no_show_at' => 'datetime',
        'debt_flagged_at' => 'datetime',
    ];

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getAgeAttribute(): ?int
    {
        return $this->date_of_birth?->age;
    }

    public function getOutstandingAttribute(): float
    {
        return (float) $this->invoices()
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->sum('balance');
    }

    /**
     * Get the last (most recent) medical case string, or null.
     */
    public function getLastMedicalCaseAttribute(): ?string
    {
        $cases = $this->medical_cases ?? [];
        if (empty($cases)) {
            return null;
        }
        $last = end($cases);
        return $last['case'] ?? null;
    }

    /**
     * Push a new case onto the medical_cases array and save.
     */
    public function pushMedicalCase(string $case, string $source = 'waitlist'): void
    {
        $cases = $this->medical_cases ?? [];
        $cases[] = [
            'case' => $case,
            'added_at' => now()->toIso8601String(),
            'source' => $source,
        ];
        $this->update([
            'medical_cases' => $cases,
        ]);
    }

    /**
     * REQ-15: Flag patient as having unpaid emergency debt.
     */
    public function flagDebt(float $amount, int $invoiceId, int $flaggedBy): void
    {
        $this->update([
            'has_debt'        => true,
            'debt_amount'     => $amount,
            'debt_invoice_id' => $invoiceId,
            'debt_flagged_at' => now(),
            'debt_flagged_by' => $flaggedBy,
        ]);
    }

    /**
     * REQ-15: Clear debt when emergency invoice is paid.
     */
    public function clearDebt(): void
    {
        $this->update([
            'has_debt'        => false,
            'debt_amount'     => 0,
            'debt_invoice_id' => null,
            'debt_flagged_at' => null,
            'debt_flagged_by' => null,
        ]);
    }

    /**
     * Check if patient has an active clinic card
     */
    public function hasActiveCard(): bool
    {
        return $this->has_card && $this->card_is_active && !empty($this->card_number);
    }

    /**
     * Get clinic card display info
     */
    public function getCardInfo(): ?array
    {
        if (!$this->hasActiveCard()) {
            return null;
        }

        return [
            'card_number' => $this->card_number,
            'is_active' => $this->card_is_active,
            'issued_at' => $this->created_at?->toDateString(),
        ];
    }

    /**
     * Activate patient's clinic card
     */
    public function activateCard(string $cardNumber): void
    {
        $this->update([
            'card_number' => $cardNumber,
            'has_card' => true,
            'card_is_active' => true,
        ]);
    }

    /**
     * Deactivate patient's clinic card
     */
    public function deactivateCard(): void
    {
        $this->update([
            'card_is_active' => false,
        ]);
    }

    /**
     * Record a no-show and update deposit requirement if needed
     */
    public function recordNoShow(): void
    {
        $newCount = $this->no_show_count + 1;
        $updateData = [
            'no_show_count' => $newCount,
            'last_no_show_at' => now(),
        ];

        // After 3 no-shows, require deposit for future appointments
        if ($newCount >= 3 && !$this->requires_deposit) {
            $updateData['requires_deposit'] = true;
        }

        $this->update($updateData);
    }

    /**
     * Check if patient requires deposit before appointment
     */
    public function requiresDeposit(): bool
    {
        return $this->requires_deposit || $this->no_show_count >= 3;
    }

    /**
     * Reset no-show counter (e.g., after good behavior or manual override)
     */
    public function resetNoShowCounter(): void
    {
        $this->update([
            'no_show_count' => 0,
            'requires_deposit' => false,
            'last_no_show_at' => null,
        ]);
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class)
                    ->orderByDesc('appointment_time');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class)
                    ->orderByDesc('issued_at');
    }

    public function xRays(): HasMany
    {
        return $this->hasMany(XRay::class)
                    ->orderByDesc('captured_at');
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class)
                    ->orderByDesc('created_at');
    }

    public function recalls(): HasMany
    {
        return $this->hasMany(Recall::class)
                    ->orderByDesc('due_date');
    }

    public function waitlistEntries(): HasMany
    {
        return $this->hasMany(WaitlistEntry::class);
    }

    public function queueItems(): HasMany
    {
        return $this->hasMany(QueueItem::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        if ($branchId === null) {
            return $query;
        }
        return $query->where('branch_id', $branchId);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeRequiresDeposit($query)
    {
        return $query->where('requires_deposit', true)
            ->orWhere('no_show_count', '>=', 3);
    }

    public function scopeHasActiveCard($query)
    {
        return $query->where('has_card', true)
            ->where('card_is_active', true)
            ->whereNotNull('card_number');
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('first_name', 'like', "%{$term}%")
              ->orWhere('last_name', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%")
              ->orWhere('email', 'like', "%{$term}%")
              ->orWhere('card_number', 'like', "%{$term}%");
        });
    }

    // ── API format helper ─────────────────────────────────────────────────────

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'age' => $this->age,
            'gender' => $this->gender,
            'city' => $this->city,
            'address' => $this->address,
            'insurance_provider' => $this->insurance_provider,
            'insurance_number' => $this->insurance_number,
            'medical_cases' => $this->medical_cases ?? [],
            'last_medical_case' => $this->last_medical_case,
            'other_conditions' => $this->other_conditions,
            'status' => $this->status,
            'branch' => $this->branch
                ? ['id' => $this->branch->id, 'name' => $this->branch->name]
                : null,
            'outstanding' => $this->outstanding,
            'has_portal_access' => $this->user_id !== null,
            'registered' => $this->created_at?->toDateString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            
            // Card & No-Show Fields
            'card_number' => $this->card_number,
            'has_card' => $this->has_card,
            'card_is_active' => $this->card_is_active,
            'has_active_card' => $this->hasActiveCard(),
            'card_info' => $this->getCardInfo(),
            'no_show_count' => $this->no_show_count,
            'requires_deposit' => $this->requiresDeposit(),
            'is_blocked' => $this->is_blocked,
            'medical_alerts' => $this->medical_alerts,
            'vip' => $this->vip,
            'last_no_show_at' => $this->last_no_show_at?->toDateString(),
        ];
    }
}