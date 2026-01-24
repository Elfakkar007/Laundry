<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Outlet extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'alamat',
        'tlp',
    ];

    /**
     * Relasi ke Users
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'id_outlet');
    }

    /**
     * Relasi ke Pakets
     */
    public function pakets(): HasMany
    {
        return $this->hasMany(Paket::class, 'id_outlet');
    }

    /**
     * Relasi ke Transaksis
     */
    public function transaksis(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_outlet');
    }
}