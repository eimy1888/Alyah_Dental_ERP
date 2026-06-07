<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Service extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'services';

    protected $fillable = [
        'clinic_id',
        'name',
        'description',
        'category',
        'duration_minutes',
        'price',
        'icon_url',
        'is_published',
        'display_order',
        // v2 billing
        'billing_model',
        'generate_invoice_at_booking',
        'allow_prepayment',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration_minutes' => 'integer',
        'is_published' => 'boolean',
        'display_order' => 'integer',
        'generate_invoice_at_booking' => 'boolean',
        'allow_prepayment' => 'boolean',
    ];

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────
    
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    // ─────────────────────────────────────────────────────────────
    // Scopes
    // ─────────────────────────────────────────────────────────────
    
    public function scopeForClinic($query, int $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }

    // ─────────────────────────────────────────────────────────────
    // Accessors
    // ─────────────────────────────────────────────────────────────
    
    public function getFormattedPriceAttribute(): string
    {
        return 'ETB ' . number_format($this->price, 2);
    }

    public function getCategoryLabelAttribute(): string
    {
        $labels = [
            'general' => 'General',
            'preventive' => 'Preventive',
            'restorative' => 'Restorative',
            'cosmetic' => 'Cosmetic',
            'emergency' => 'Emergency',
        ];
        return $labels[$this->category] ?? ucfirst($this->category);
    }
}