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
        // smart booking
        'required_specializations',
        'booking_type',
        // specialist / lab fields
        'specialist_category',
        'is_diagnostic',
        'requires_fab_lab',
    ];

    protected $casts = [
        'price'                       => 'decimal:2',
        'duration_minutes'            => 'integer',
        'is_published'                => 'boolean',
        'display_order'               => 'integer',
        'generate_invoice_at_booking' => 'boolean',
        'allow_prepayment'            => 'boolean',
        'required_specializations'    => 'array',   // JSON → PHP array automatically
        'is_diagnostic'               => 'boolean',
        'requires_fab_lab'            => 'boolean',
    ];

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────
    
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Inventory items consumed when this service/treatment is performed.
     * Pivot carries: quantity_used, notes
     */
    public function inventoryItems()
    {
        return $this->belongsToMany(
            InventoryItem::class,
            'service_inventory_items',
            'service_id',
            'inventory_item_id'
        )->withPivot('quantity_used', 'notes')->withTimestamps();
    }

    /**
     * Deduct all linked inventory items for a completed procedure.
     * Called automatically when appointment is finalized.
     *
     * @param  int         $clinicId
     * @param  int|null    $branchId
     * @param  int         $performedById  User who performed the procedure
     * @param  string|null $appointmentRef  For audit notes
     */
    public function deductInventory(int $clinicId, ?int $branchId, int $performedById, ?string $appointmentRef = null): void
    {
        foreach ($this->inventoryItems as $item) {
            $qty = (float) $item->pivot->quantity_used;
            if ($qty <= 0) continue;

            // Only deduct from items that belong to this clinic
            if ($item->clinic_id !== $clinicId) continue;

            $previous = $item->current_quantity;
            $new      = max(0, $previous - $qty);

            $item->update(['current_quantity' => $new]);

            \App\Models\InventoryTransaction::create([
                'clinic_id'         => $clinicId,
                'branch_id'         => $branchId,
                'inventory_item_id' => $item->id,
                'performed_by'      => $performedById,
                'type'              => 'usage',
                'quantity_change'   => -$qty,
                'previous_quantity' => $previous,
                'new_quantity'      => $new,
                'notes'             => $appointmentRef
                    ? "Auto-deducted for: {$this->name} (Appt #{$appointmentRef})"
                    : "Auto-deducted for: {$this->name}",
            ]);
        }
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