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
        'latitude',      
        'longitude',     
        'price_per_km', 
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'price_per_km' => 'integer',
        ];
    }

    public function hasLocation(): bool
    {
        return !is_null($this->latitude) && !is_null($this->longitude);
    }

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