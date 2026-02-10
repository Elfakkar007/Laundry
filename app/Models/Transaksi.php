<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    use HasFactory;

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
        ];
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
        return $this->shipping_id !== null;
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
     * CATATAN: biaya_tambahan di database sudah INCLUDE shipping cost
     * karena di TransaksiController->store(), kita set:
     * 'biaya_tambahan' => $calculation['total_surcharge'] + $calculation['shipping_cost']
     */
    public function getTotalSebelumDiskonAttribute(): float
    {
        $subtotal = $this->detailTransaksis->sum(function ($detail) {
            return $detail->qty * $detail->paket->harga;
        });
        
        // biaya_tambahan sudah include surcharge + shipping
        return $subtotal + $this->biaya_tambahan;
    }

    /**
     * Accessor untuk total akhir.
     * FIXED: Pajak harus ditambahkan SETELAH semua komponen (termasuk shipping)
     * 
     * Flow perhitungan:
     * 1. Subtotal items
     * 2. + Biaya tambahan (surcharge + shipping)
     * 3. - Diskon
     * 4. + Pajak (dari hasil step 3)
     * = Total Akhir
     */
    public function getTotalAkhirAttribute(): float
    {
        // Subtotal items dari detail transaksi
        $subtotal = $this->detailTransaksis->sum(function ($detail) {
            return $detail->qty * $detail->paket->harga;
        });
        
        // Base = subtotal + biaya_tambahan (yang sudah include surcharge + shipping)
        $base = $subtotal + (float) $this->biaya_tambahan;
        
        // Setelah diskon
        $afterDiscount = $base - (float) $this->diskon;
        
        // Total akhir = after discount + pajak
        // Pajak di DB sudah dalam bentuk nominal (bukan persen), hasil perhitungan di controller
        $totalAkhir = $afterDiscount + (float) $this->pajak;
        
        return $totalAkhir;
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
            return isset($discount['id']) && $discount['id'] !== 'points';
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
            if (isset($discount['id']) && $discount['id'] === 'points') {
                return $discount;
            }
        }

        return null;
    }
}