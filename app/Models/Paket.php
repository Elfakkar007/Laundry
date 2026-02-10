<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Paket extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'id_outlet',
        'id_package_type',
        'nama_paket',
        'harga',
        'satuan',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'harga' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['id_outlet', 'id_package_type', 'nama_paket', 'harga', 'satuan', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relasi ke Outlet
     */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'id_outlet');
    }

    /**
     * Relasi ke PackageType
     */
    public function packageType(): BelongsTo
    {
        return $this->belongsTo(PackageType::class, 'id_package_type');
    }

    /**
     * Relasi ke DetailTransaksis
     */
    public function detailTransaksis(): HasMany
    {
        return $this->hasMany(DetailTransaksi::class, 'id_paket');
    }

    /**
     * Scope untuk hanya paket yang aktif
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}