<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointHistory extends Model
{
    use HasFactory;

    // Constants for types
    public const TYPE_EARN = 'earn';
    public const TYPE_REDEEM = 'redeem';
    public const TYPE_ADJUSTMENT = 'adjustment';

    protected $fillable = [
        'id_customer',
        'type',
        'points',
        'transaction_amount',
        'reference_type',
        'reference_id',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'points' => 'integer',
            'transaction_amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Relasi ke Customer
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    /**
     * Relasi ke User (admin yang input)
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope untuk filter by customer
     */
    public function scopeForCustomer($query, $customerId)
    {
        return $query->where('id_customer', $customerId);
    }

    /**
     * Scope untuk filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get formatted type label
     */
    public function getTypeLabel(): string
    {
        return match($this->type) {
            self::TYPE_EARN => 'Dapat Poin',
            self::TYPE_REDEEM => 'Tukar Poin',
            self::TYPE_ADJUSTMENT => 'Koreksi Admin',
            default => 'Unknown'
        };
    }

    /**
     * Get badge color for type
     */
    public function getTypeBadgeColor(): string
    {
        return match($this->type) {
            self::TYPE_EARN => 'green',
            self::TYPE_REDEEM => 'blue',
            self::TYPE_ADJUSTMENT => 'yellow',
            default => 'gray'
        };
    }
}