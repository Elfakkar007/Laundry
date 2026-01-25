<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Promo extends Model
{
    use HasFactory;

    // Constants untuk Jenis
    public const JENIS_FIXED = 'fixed';
    public const JENIS_PERCENT = 'percent';

    protected $fillable = [
        'nama_promo',
        'diskon',
        'jenis',
        'syarat_member_only',
        'is_active',
        'tanggal_mulai',
        'tanggal_selesai',
        'minimal_transaksi',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'diskon' => 'decimal:2',
            'syarat_member_only' => 'boolean',
            'is_active' => 'boolean',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'minimal_transaksi' => 'decimal:2',
        ];
    }

    /**
     * Scope untuk filter promo aktif
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope untuk filter promo yang berlaku saat ini
     */
    public function scopeValid($query)
    {
        $now = Carbon::now()->toDateString();
        
        return $query->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('tanggal_mulai')
                  ->orWhere('tanggal_mulai', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('tanggal_selesai')
                  ->orWhere('tanggal_selesai', '>=', $now);
            });
    }

    /**
     * Check if promo is currently valid
     */
    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = Carbon::now();

        if ($this->tanggal_mulai && $now->lt($this->tanggal_mulai)) {
            return false;
        }

        if ($this->tanggal_selesai && $now->gt($this->tanggal_selesai)) {
            return false;
        }

        return true;
    }

    /**
     * Check if customer can use this promo
     */
    public function canBeUsedBy(?Customer $customer): bool
    {
        if (!$this->isValid()) {
            return false;
        }

        if ($this->syarat_member_only && (!$customer || !$customer->is_member)) {
            return false;
        }

        return true;
    }

    /**
     * Calculate discount amount based on subtotal
     */
    public function calculateDiscount(float $subtotal): float
    {
        // Check minimal transaksi
        if ($this->minimal_transaksi && $subtotal < $this->minimal_transaksi) {
            return 0;
        }

        if ($this->jenis === self::JENIS_PERCENT) {
            return ($subtotal * $this->diskon) / 100;
        }
        
        return min((float) $this->diskon, $subtotal);
    }

    /**
     * Get formatted diskon display
     */
    public function getFormattedDiskonAttribute(): string
    {
        if ($this->jenis === self::JENIS_PERCENT) {
            return $this->diskon . '%';
        }
        
        return 'Rp ' . number_format($this->diskon, 0, ',', '.');
    }

    /**
     * Get status badge info
     */
    public function getStatusAttribute(): string
    {
        if (!$this->is_active) {
            return 'Nonaktif';
        }

        if (!$this->isValid()) {
            return 'Expired';
        }

        return 'Aktif';
    }
}