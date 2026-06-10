<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ClinicalNote extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'dentist_id',
        'appointment_id',
        'note_type',
        'content',
        'chief_complaint',
        'treatment_performed',
        'follow_up',
        'vitals',
        'is_signed',
        'signed_at',
    ];

    protected $casts = [
        'vitals'    => 'array',
        'is_signed' => 'boolean',
        'signed_at' => 'datetime',
    ];

    // ── Note type constants ────────────────────────────────
    const TYPE_GENERAL          = 'General';
    const TYPE_TREATMENT_PLAN   = 'Treatment Plan';
    const TYPE_POST_OP          = 'Post-Op';
    const TYPE_FOLLOW_UP        = 'Follow-Up';
    const TYPE_REFERRAL         = 'Referral';
    const TYPE_COMPLAINT        = 'Complaint';

    // ── Relationships ──────────────────────────────────────

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function dentist()
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    // ── Scopes ────────────────────────────────────────────

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

    public function scopeForDentist($query, int $dentistId)
    {
        return $query->where('dentist_id', $dentistId);
    }

    public function scopeForPatient($query, int $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeUnsigned($query)
    {
        return $query->where('is_signed', false);
    }

    public function scopeSigned($query)
    {
        return $query->where('is_signed', true);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('note_type', $type);
    }

    public function scopeCreatedBetween($query, string $from, string $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    // ── Actions ───────────────────────────────────────────

    /**
     * Sign the note. Once signed it is immutable — use addAddendum() for corrections.
     */
    public function sign(): bool
    {
        if ($this->is_signed) {
            return false;
        }

        $this->update([
            'is_signed' => true,
            'signed_at' => now(),
        ]);

        return true;
    }

    /**
     * Append an addendum to a signed note.
     * Original content is never overwritten — addendum is appended with timestamp.
     * This is the correct medico-legal pattern for amending signed notes.
     */
    public function addAddendum(string $addendum, int $addedByUserId): void
    {
        $timestamp = now()->format('d M Y H:i');
        $user      = \App\Models\User::find($addedByUserId);
        $byName    = $user?->name ?? "User #{$addedByUserId}";

        $this->update([
            'content' => $this->content
                . "\n\n[ADDENDUM — {$timestamp} by {$byName}]\n"
                . $addendum,
        ]);
    }

    // ── Immutability guard ────────────────────────────────
    // Prevent overwriting core content fields after the note is signed.
    // Only addendum (via addAddendum) and non-clinical fields are allowed.

    protected static function booted(): void
    {
        static::updating(function (self $note) {
            if (!$note->is_signed) {
                return; // unsigned — allow all edits
            }

            // Fields that are NEVER allowed to change after signing
            $immutableFields = ['note_type', 'chief_complaint', 'treatment_performed', 'vitals'];

            foreach ($immutableFields as $field) {
                if ($note->isDirty($field)) {
                    throw new \RuntimeException(
                        "Cannot modify '{$field}' on a signed clinical note (ID: {$note->id}). "
                        . "Use addAddendum() to append corrections."
                    );
                }
            }

            // 'content' can only change if it was updated via addAddendum
            // (addAddendum appends — it never shortens the content)
            if ($note->isDirty('content')) {
                $original = $note->getOriginal('content');
                $new      = $note->content;
                if ($original && !str_starts_with($new, $original)) {
                    throw new \RuntimeException(
                        "Cannot replace content on a signed clinical note (ID: {$note->id}). "
                        . "Use addAddendum() to append corrections."
                    );
                }
            }
        });
    }

    // ── Computed attributes ────────────────────────────────

    public function getContentSnippetAttribute(): string
    {
        return strlen($this->content) > 100
            ? substr($this->content, 0, 100) . '...'
            : $this->content;
    }

    // ── Medical Records transformation ────────────────────
    // Used by MedicalRecordController to build unified timeline

    public function toMedicalRecord(): array
    {
        return [
            'id'           => $this->id,
            'type'         => 'clinical_note',
            'patient_id'   => $this->patient_id,
            'patient_name' => $this->patient?->full_name ?? '—',
            'date'         => $this->created_at->toDateString(),
            'description'  => "Clinical Note: {$this->note_type}",
            'details'      => [
                'note_type'           => $this->note_type,
                'content'             => $this->content,
                'content_snippet'     => $this->content_snippet,
                'chief_complaint'     => $this->chief_complaint,
                'treatment_performed' => $this->treatment_performed,
                'follow_up'           => $this->follow_up,
                'vitals'              => $this->vitals,
                'is_signed'           => $this->is_signed,
                'signed_at'           => $this->signed_at?->toDateTimeString(),
            ],
        ];
    }
}