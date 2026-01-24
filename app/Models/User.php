<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'nama',
        'username',
        'password',
        'id_outlet',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
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
     * Relasi ke Transaksis
     */
    public function transaksis(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_user');
    }

    /**
     * Relasi ke Logs
     */
    public function logs(): HasMany
    {
        return $this->hasMany(Log::class, 'id_user');
    }
}