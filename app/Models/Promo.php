<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Promo extends Model
{
    use HasFactory, LogsActivity;

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
        'is_stackable', // NEW: Bisa dikombinasikan dengan promo lain
        'priority', // NEW: Prioritas urutan penerapan (semakin kecil = lebih prioritas)
    ];

    protected function casts(): array
    {
        return [
            'diskon' => 'decimal:2',
            'syarat_member_only' => 'boolean',
            'is_active' => 'boolean',
            'is_stackable' => 'boolean',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'minimal_transaksi' => 'decimal:2',
            'priority' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nama_promo', 'diskon', 'jenis', 'is_active', 'tanggal_mulai', 'tanggal_selesai', 'minimal_transaksi'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
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
     * Scope untuk filter promo yang stackable
     */
    public function scopeStackable($query)
    {
        return $query->where('is_stackable', true);
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
    public function canBeUsedBy(?Customer $customer, float $subtotal = 0): bool
    {
        if (!$this->isValid()) {
            return false;
        }

        if ($this->syarat_member_only && (!$customer || !$customer->is_member)) {
            return false;
        }

        // Check minimal transaksi
        if ($this->minimal_transaksi && $subtotal < $this->minimal_transaksi) {
            return false;
        }

        return true;
    }

    /**
     * Calculate discount amount based on subtotal
     * NEW: Accepts current subtotal (after previous discounts applied)
     */
    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal <= 0) {
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

    /**
     * NEW: Get all applicable promos for a customer and subtotal
     * Returns promos ordered by priority
     */
    public static function getApplicablePromos(?Customer $customer, float $subtotal): \Illuminate\Support\Collection
    {
        return static::active()
            ->valid()
            ->stackable()
            ->orderBy('priority', 'asc')
            ->orderBy('created_at', 'asc')
            ->get()
            ->filter(function ($promo) use ($customer, $subtotal) {
                return $promo->canBeUsedBy($customer, $subtotal);
            });
    }

    /**
     * NEW: Calculate multiple stacked discounts
     * Returns array with discount details
     */
    public static function calculateStackedDiscounts(?Customer $customer, float $baseAmount): array
    {
        $applicablePromos = static::getApplicablePromos($customer, $baseAmount);
        
        $discounts = [];
        $remainingAmount = $baseAmount;
        $totalDiscount = 0;

        foreach ($applicablePromos as $promo) {
            if ($remainingAmount <= 0) {
                break;
            }

            // Check if promo is still applicable with current remaining amount
            if (!$promo->canBeUsedBy($customer, $remainingAmount)) {
                continue;
            }

            $discount = $promo->calculateDiscount($remainingAmount);
            
            if ($discount > 0) {
                $discounts[] = [
                    'id' => $promo->id,
                    'nama' => $promo->nama_promo,
                    'jenis' => $promo->jenis,
                    'nilai' => $promo->diskon,
                    'amount' => $discount,
                    'is_member_only' => $promo->syarat_member_only,
                ];

                $totalDiscount += $discount;
                $remainingAmount -= $discount;
            }
        }

        return [
            'discounts' => $discounts,
            'total_discount' => $totalDiscount,
            'final_amount' => max(0, $baseAmount - $totalDiscount),
        ];
    }
}