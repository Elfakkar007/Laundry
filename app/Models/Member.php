<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasFactory;

    // Constants untuk Jenis Kelamin (opsional, untuk validasi)
    public const JENIS_KELAMIN_LAKI = 'L';
    public const JENIS_KELAMIN_PEREMPUAN = 'P';

    protected $fillable = [
        'nama',
        'alamat',
        'jenis_kelamin',
        'tlp',
    ];

    /**
     * Relasi ke Transaksis
     */
    public function transaksis(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_member');
    }

    /**
     * Accessor untuk jenis kelamin lengkap
     */
    public function getJenisKelaminLengkapAttribute(): string
    {
        return $this->jenis_kelamin === self::JENIS_KELAMIN_LAKI ? 'Laki-laki' : 'Perempuan';
    }
}