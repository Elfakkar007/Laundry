<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Surcharge extends Model
{
    use HasFactory;

    // Constants untuk Calculation Type
    public const TYPE_FIXED = 'fixed';
    public const TYPE_PERCENT = 'percent';
    public const TYPE_DISTANCE = 'distance';

    protected $fillable = [
        'nama',
        'nominal',
        'calculation_type',
        'min_order_total',
        'keterangan',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'nominal' => 'decimal:2',
            'min_order_total' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Scope untuk filter surcharge aktif
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Helper untuk mendapatkan calculation types
     */
    public static function getAvailableTypes(): array
    {
        return [
            self::TYPE_FIXED,
            self::TYPE_PERCENT,
            self::TYPE_DISTANCE,
        ];
    }

    /**
     * Calculate surcharge amount based on subtotal and distance
     * 
     * @param float $subtotal
     * @param float|null $distance Distance in KM (for distance-based)
     * @return float
     */
    public function calculateAmount(float $subtotal, ?float $distance = null): float
    {
        // Check free shipping logic
        if ($this->min_order_total && $subtotal >= $this->min_order_total) {
            return 0; // GRATIS
        }

        switch ($this->calculation_type) {
            case self::TYPE_PERCENT:
                return ($subtotal * $this->nominal) / 100;
            
            case self::TYPE_DISTANCE:
                // Jika tidak ada distance, return 0
                if (!$distance || $distance <= 0) {
                    return 0;
                }
                return $this->nominal * $distance;
            
            case self::TYPE_FIXED:
            default:
                return (float) $this->nominal;
        }
    }

    /**
     * Get formatted nominal display
     */
    public function getFormattedNominalAttribute(): string
    {
        switch ($this->calculation_type) {
            case self::TYPE_PERCENT:
                return $this->nominal . '%';
            
            case self::TYPE_DISTANCE:
                return 'Rp ' . number_format($this->nominal, 0, ',', '.') . '/km';
            
            case self::TYPE_FIXED:
            default:
                return 'Rp ' . number_format($this->nominal, 0, ',', '.');
        }
    }

    /**
     * Check if has free shipping
     */
    public function hasFreeShipping(): bool
    {
        return $this->min_order_total !== null && $this->min_order_total > 0;
    }
}