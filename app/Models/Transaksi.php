<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    use HasFactory;

    // Constants untuk Status (nilai string dinamis)
    public const STATUS_BARU = 'baru';
    public const STATUS_PROSES = 'proses';
    public const STATUS_SELESAI = 'selesai';
    public const STATUS_DIAMBIL = 'diambil';

    // Constants untuk Dibayar (nilai string dinamis)
    public const DIBAYAR_BELUM = 'belum_dibayar';
    public const DIBAYAR_LUNAS = 'dibayar';

    protected $fillable = [
        'id_outlet',
        'kode_invoice',
        'id_member',
        'tgl',
        'batas_waktu',
        'tgl_bayar',
        'biaya_tambahan',
        'diskon',
        'pajak',
        'status',
        'dibayar',
        'id_user',
    ];

    protected function casts(): array
    {
        return [
            'tgl' => 'datetime',
            'batas_waktu' => 'datetime',
            'tgl_bayar' => 'datetime',
            'biaya_tambahan' => 'decimal:2',
            'diskon' => 'decimal:2',
            'pajak' => 'decimal:2',
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
     * Relasi ke Member
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'id_member');
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
        ];
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
     */
    public function getTotalSebelumDiskonAttribute(): float
    {
        $subtotal = $this->detailTransaksis->sum(function ($detail) {
            return $detail->qty * $detail->paket->harga;
        });
        return $subtotal + $this->biaya_tambahan;
    }

    /**
     * Accessor untuk total akhir
     */
    public function getTotalAkhirAttribute(): float
    {
        $total = $this->total_sebelum_diskon - $this->diskon;
        return $total + ($total * $this->pajak / 100);
    }
}