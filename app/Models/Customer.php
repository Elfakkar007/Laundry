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
        'email',
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
     * Method untuk menambah poin
     */
    public function addPoin(int $poin): void
    {
        $this->increment('poin', $poin);
    }

    /**
     * Method untuk mengurangi poin
     */
    public function usePoin(int $poin): bool
    {
        if ($this->poin < $poin) {
            return false;
        }
        
        $this->decrement('poin', $poin);
        return true;
    }
}