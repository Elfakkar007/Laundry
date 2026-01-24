<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailTransaksi extends Model
{
    use HasFactory;

    protected $fillable = [
        'id_transaksi',
        'id_paket',
        'qty',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:2',
        ];
    }

    /**
     * Relasi ke Transaksi
     */
    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'id_transaksi');
    }

    /**
     * Relasi ke Paket
     */
    public function paket(): BelongsTo
    {
        return $this->belongsTo(Paket::class, 'id_paket');
    }

    /**
     * Accessor untuk subtotal item
     */
    public function getSubtotalAttribute(): float
    {
        return $this->qty * $this->paket->harga;
    }
}