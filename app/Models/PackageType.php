<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackageType extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
    ];

    /**
     * Relasi ke Pakets
     */
    public function pakets(): HasMany
    {
        return $this->hasMany(Paket::class, 'id_package_type');
    }
}