<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id',
        'branch_id',
        'patient_id',
        'uploaded_by',
        'parent_document_id',
        'title',
        'category',
        'file_path',
        'original_name',
        'mime_type',
        'file_size',
        'version',
        'is_archived',
        'archived_at',
        'archived_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'version' => 'integer',
        'is_archived' => 'boolean',
        'archived_at' => 'datetime',
    ];

    public function clinic(): BelongsTo { return $this->belongsTo(Clinic::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function patient(): BelongsTo { return $this->belongsTo(Patient::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
    public function parent(): BelongsTo { return $this->belongsTo(Document::class, 'parent_document_id'); }
    public function versions(): HasMany { return $this->hasMany(Document::class, 'parent_document_id')->orderByDesc('version'); }

    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopeForBranch($query, ?int $branchId)
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }
}
