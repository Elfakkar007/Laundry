<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Transaksi extends Model
{
    use HasFactory, LogsActivity;

    // Constants untuk Status
    public const STATUS_BARU = 'baru';
    public const STATUS_PROSES = 'proses';
    public const STATUS_SELESAI = 'selesai';
    public const STATUS_DIAMBIL = 'diambil';
    public const STATUS_DIKIRIM = 'dikirim';
    public const STATUS_DITERIMA = 'diterima';
    public const STATUS_BATAL = 'batal';

    // Constants untuk Dibayar
    public const DIBAYAR_BELUM = 'belum_dibayar';
    public const DIBAYAR_LUNAS = 'dibayar';

    protected $fillable = [
        'id_outlet',
        'kode_invoice',
        'id_customer',
        'tgl',
        'batas_waktu',
        'tgl_bayar',
        'biaya_tambahan',
        'diskon',
        'diskon_detail',
        'pajak',
        'total_akhir',
        'status',
        'dibayar',
        'id_user',
        // New Shipping Fields
        'customer_lat',
        'customer_lng',
        'alamat_lengkap',
        'catatan_lokasi',
        'distance_km',
        'shipping_cost',
        'total_bayar',
        'kembalian',
    ];

    protected function casts(): array
    {
        return [
            'tgl' => 'datetime',
            'batas_waktu' => 'datetime',
            'tgl_bayar' => 'datetime',
            'biaya_tambahan' => 'decimal:2',
            'diskon' => 'decimal:2',
            'diskon_detail' => 'array',
            'pajak' => 'decimal:2',
            'total_akhir' => 'decimal:2',
            'shipping_cost' => 'decimal:2',
            'distance_km' => 'decimal:2',
            'total_bayar' => 'decimal:2',
            'kembalian' => 'decimal:2',
        ];
    }

    /**
     * Configure activity logging
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'dibayar', 'total_akhir', 'biaya_tambahan', 'diskon', 'pajak', 'tgl_bayar'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relasi ke Outlet
     */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'id_outlet');
    }

    /**
     * Relasi ke Customer
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    /**
     * Relasi ke User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    /**
     * Relasi ke DetailTransaksis
     */
    public function detailTransaksis(): HasMany
    {
        return $this->hasMany(DetailTransaksi::class, 'id_transaksi');
    }

    /**
     * Helper untuk mendapatkan semua status yang tersedia
     */
    public static function getAvailableStatuses(): array
    {
        return [
            self::STATUS_BARU,
            self::STATUS_PROSES,
            self::STATUS_SELESAI,
            self::STATUS_DIAMBIL,
            self::STATUS_DIKIRIM,
            self::STATUS_DITERIMA,
            self::STATUS_BATAL,
        ];
    }

    /**
     * Check if this transaction is a delivery order
     */
    public function isDelivery(): bool
    {
        return $this->shipping_cost > 0 || $this->distance_km > 0;
    }

    /**
     * Get allowed next statuses based on current status and delivery type
     */
    public function getAllowedNextStatuses(): array
    {
        $isDelivery = $this->isDelivery();
        
        switch ($this->status) {
            case self::STATUS_BARU:
                return [self::STATUS_PROSES, self::STATUS_BATAL];
            
            case self::STATUS_PROSES:
                return [self::STATUS_SELESAI, self::STATUS_BATAL];
            
            case self::STATUS_SELESAI:
                if ($isDelivery) {
                    return [self::STATUS_DIKIRIM];
                }
                return [self::STATUS_DIAMBIL];
            
            case self::STATUS_DIKIRIM:
                return [self::STATUS_DITERIMA];
            
            default:
                // Terminal states: diambil, diterima, batal
                return [];
        }
    }

    /**
     * Get status label with icon
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_BARU => '🆕 Baru',
            self::STATUS_PROSES => '⚙️ Proses',
            self::STATUS_SELESAI => '✅ Selesai',
            self::STATUS_DIAMBIL => '📦 Diambil',
            self::STATUS_DIKIRIM => '🚚 Dikirim',
            self::STATUS_DITERIMA => '✅ Diterima',
            self::STATUS_BATAL => '❌ Batal',
            default => $this->status,
        };
    }

    /**
     * Helper untuk mendapatkan status pembayaran
     */
    public static function getAvailablePaymentStatuses(): array
    {
        return [
            self::DIBAYAR_BELUM,
            self::DIBAYAR_LUNAS,
        ];
    }

    /**
     * Accessor untuk total sebelum diskon
     * FIXED: shipping_cost sekarang terpisah dari biaya_tambahan
     */
    public function getTotalSebelumDiskonAttribute(): float
    {
        $subtotal = $this->detailTransaksis->sum(function ($detail) {
            return $detail->qty * $detail->paket->harga;
        });
        
        // biaya_tambahan = surcharge saja (tanpa shipping)
        // shipping_cost = ongkir (terpisah)
        return $subtotal + (float) $this->biaya_tambahan + (float) $this->shipping_cost;
    }

    /**
     * Accessor untuk total akhir.
     * CRITICAL FIX: shipping_cost HARUS ditambahkan secara eksplisit
     * 
     * Flow perhitungan yang BENAR:
     * 1. Subtotal items
     * 2. + Biaya tambahan (surcharge saja, TANPA shipping)
     * 3. + Shipping cost (terpisah, field sendiri)
     * 4. - Diskon
     * 5. + Pajak
     * = Total Akhir
     */
    public function getTotalAkhirAttribute(): float
    {
        // CRITICAL: Cek dulu apakah total_akhir sudah disimpan di database
        // Jika sudah ada, gunakan nilai dari DB (untuk backward compatibility)
        $dbValue = $this->attributes['total_akhir'] ?? null;
        if ($dbValue !== null && $dbValue > 0) {
            return (float) $dbValue;
        }

        // Jika belum ada di DB, hitung manual (untuk transaksi lama sebelum migrasi)
        // 1. Subtotal items
        $subtotal = $this->detailTransaksis->sum(function ($detail) {
            return $detail->qty * ($detail->paket->harga ?? 0);
        });
        
        // 2. + Biaya tambahan (surcharge only, tanpa shipping)
        $base = $subtotal + (float) $this->biaya_tambahan;
        
        // 3. + Shipping cost (CRITICAL: ini yang hilang di versi sebelumnya!)
        $baseWithShipping = $base + (float) $this->shipping_cost;
        
        // 4. - Diskon
        $afterDiscount = $baseWithShipping - (float) $this->diskon;
        
        // 5. + Pajak
        $totalAkhir = $afterDiscount + (float) $this->pajak;
        
        return max(0, $totalAkhir); // Tidak boleh negatif
    }

    /**
     * NEW: Get applied promos detail
     */
    public function getAppliedPromosAttribute(): array
    {
        if (!$this->diskon_detail) {
            return [];
        }

        // Filter only promo discounts (exclude points)
        return array_filter($this->diskon_detail, function($discount) {
            return isset($discount['type']) && $discount['type'] === 'promo';
        });
    }

    /**
     * NEW: Get points discount detail
     */
    public function getPointsDiscountAttribute(): ?array
    {
        if (!$this->diskon_detail) {
            return null;
        }

        foreach ($this->diskon_detail as $discount) {
            if (isset($discount['type']) && $discount['type'] === 'points') {
                return $discount;
            }
        }

        return null;
    }
}