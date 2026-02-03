<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'no_hp',
        'alamat',
        'is_member',
        'poin',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_member' => 'boolean',
            'poin' => 'integer',
        ];
    }

    /**
     * Relasi ke User (untuk e-commerce login)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relasi ke Transaksis
     */
    public function transaksis(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_customer');
    }

    /**
     * Relasi ke Point Histories
     */
    public function pointHistories(): HasMany
    {
        return $this->hasMany(PointHistory::class, 'id_customer');
    }

    /**
     * Accessor untuk status member
     */
    public function getStatusMemberAttribute(): string
    {
        return $this->is_member ? 'Member' : 'Reguler';
    }

    /**
     * Scope untuk filter member aktif
     */
    public function scopeMembers($query)
    {
        return $query->where('is_member', true);
    }

    /**
     * Scope untuk filter reguler
     */
    public function scopeReguler($query)
    {
        return $query->where('is_member', false);
    }

    /**
     * Method untuk menambah poin dengan history
     *
     * @param int $points Jumlah poin yang ditambahkan
     * @param string $type Type history: 'earn', 'adjustment'
     * @param array $data Additional data (notes, transaction_amount, reference, dll)
     * @return PointHistory
     */
    public function addPoints(int $points, string $type = PointHistory::TYPE_EARN, array $data = []): PointHistory
    {
        $this->increment('poin', $points);

        return $this->pointHistories()->create([
            'type' => $type,
            'points' => $points,
            'transaction_amount' => $data['transaction_amount'] ?? null,
            'reference_type' => $data['reference_type'] ?? null,
            'reference_id' => $data['reference_id'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $data['created_by'] ?? auth()->id(),
        ]);
    }

    /**
     * Method untuk mengurangi poin dengan history
     *
     * @param int $points Jumlah poin yang dikurangi
     * @param string $type Type history: 'redeem', 'adjustment'
     * @param array $data Additional data (notes, reference, dll)
     * @return PointHistory|false False jika poin tidak cukup
     */
    public function deductPoints(int $points, string $type = PointHistory::TYPE_REDEEM, array $data = [])
    {
        if ($this->poin < $points) {
            return false;
        }

        $this->decrement('poin', $points);

        return $this->pointHistories()->create([
            'type' => $type,
            'points' => -$points, // Negative untuk pengurangan
            'transaction_amount' => $data['transaction_amount'] ?? null,
            'reference_type' => $data['reference_type'] ?? null,
            'reference_id' => $data['reference_id'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $data['created_by'] ?? auth()->id(),
        ]);
    }

    /**
     * Method untuk koreksi poin manual (bisa + atau -)
     *
     * @param int $points Jumlah poin (positif untuk tambah, negatif untuk kurang)
     * @param string $notes Catatan wajib
     * @return PointHistory
     */
    public function adjustPoints(int $points, string $notes): PointHistory
    {
        // Update saldo poin
        $newBalance = $this->poin + $points;
        $this->update(['poin' => max(0, $newBalance)]); // Tidak boleh negatif

        return $this->pointHistories()->create([
            'type' => PointHistory::TYPE_ADJUSTMENT,
            'points' => $points,
            'notes' => $notes,
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * Hitung poin yang didapat dari nominal transaksi
     *
     * @param float $amount Nominal transaksi
     * @return int Jumlah poin
     */
    public static function calculatePointsFromAmount(float $amount): int
    {
        $enabled = Setting::getValue('points_enabled', true);
        if (!$enabled) {
            return 0;
        }

        $ratio = (float) Setting::getValue('points_earn_ratio', 10000);
        if ($ratio <= 0) {
            return 0;
        }

        return (int) floor($amount / $ratio);
    }

    /**
     * Hitung nilai Rupiah dari sejumlah poin
     *
     * @param int $points Jumlah poin
     * @return float Nilai dalam Rupiah
     */
    public static function calculatePointsValue(int $points): float
    {
        $value = (float) Setting::getValue('points_redeem_value', 500);
        return $points * $value;
    }
}