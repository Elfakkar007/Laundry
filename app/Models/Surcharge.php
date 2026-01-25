<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Surcharge extends Model
{
    use HasFactory;

    // Constants untuk Jenis
    public const JENIS_FIXED = 'fixed';
    public const JENIS_PERCENT = 'percent';

    protected $fillable = [
        'nama',
        'nominal',
        'jenis',
        'keterangan',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'nominal' => 'decimal:2',
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
     * Helper untuk mendapatkan jenis yang tersedia
     */
    public static function getAvailableJenis(): array
    {
        return [
            self::JENIS_FIXED,
            self::JENIS_PERCENT,
        ];
    }

    /**
     * Calculate surcharge amount based on subtotal
     */
    public function calculateAmount(float $subtotal): float
    {
        if ($this->jenis === self::JENIS_PERCENT) {
            return ($subtotal * $this->nominal) / 100;
        }
        
        return (float) $this->nominal;
    }

    /**
     * Get formatted nominal display
     */
    public function getFormattedNominalAttribute(): string
    {
        if ($this->jenis === self::JENIS_PERCENT) {
            return $this->nominal . '%';
        }
        
        return 'Rp ' . number_format($this->nominal, 0, ',', '.');
    }
}