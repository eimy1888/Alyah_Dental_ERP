<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class AuditLog extends Model
{
    // Immutable — no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_role',
        'clinic_id',
        'clinic_name',
        'branch_id',
        'event',
        'subject_type',
        'subject_id',
        'subject_label',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    // ── Factory method ────────────────────────────────────────────────────────

    /**
     * Create a new audit log entry. Call this from any controller action.
     *
     * @param  string       $event        e.g. 'clinic.approved'
     * @param  array        $attrs        additional fields: subject_type, subject_id, subject_label, old_values, new_values
     * @param  Request|null $request      for IP + user agent capture
     * @param  \App\Models\User|null $actor  defaults to authenticated user
     */
    public static function record(
        string  $event,
        array   $attrs   = [],
        ?Request $request = null,
        ?\App\Models\User $actor = null
    ): static {
        $actor = $actor ?? auth()->user();

        return static::create([
            'user_id'       => $actor?->id,
            'user_name'     => $actor?->name ?? 'System',
            'user_role'     => $actor?->role ?? 'system',
            'clinic_id'     => $attrs['clinic_id']    ?? $actor?->clinic_id,
            'clinic_name'   => $attrs['clinic_name']  ?? $actor?->clinic?->name,
            'branch_id'     => $attrs['branch_id']    ?? $actor?->branch_id,
            'event'         => $event,
            'subject_type'  => $attrs['subject_type']  ?? null,
            'subject_id'    => $attrs['subject_id']    ?? null,
            'subject_label' => $attrs['subject_label'] ?? null,
            'old_values'    => $attrs['old_values']    ?? null,
            'new_values'    => $attrs['new_values']    ?? null,
            'ip_address'    => $request?->ip(),
            'user_agent'    => $request ? substr($request->userAgent() ?? '', 0, 255) : null,
        ]);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeByActor($query, string $role)
    {
        return $query->where('user_role', $role);
    }

    public function scopeByEvent($query, string $event)
    {
        return $query->where('event', 'like', $event . '%');
    }
}
