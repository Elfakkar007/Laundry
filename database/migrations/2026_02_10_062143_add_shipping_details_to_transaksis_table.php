<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaksis', function (Blueprint $table) {
            // 1. Koordinat (Cek dulu sebelum buat)
            if (!Schema::hasColumn('transaksis', 'customer_lat')) {
                $table->decimal('customer_lat', 10, 8)->nullable()->after('id_user');
            }
            if (!Schema::hasColumn('transaksis', 'customer_lng')) {
                $table->decimal('customer_lng', 11, 8)->nullable()->after('customer_lat');
            }

            // 2. Alamat Manual & Catatan
            if (!Schema::hasColumn('transaksis', 'alamat_lengkap')) {
                $table->text('alamat_lengkap')->nullable()->after('customer_lng');
            }
            if (!Schema::hasColumn('transaksis', 'catatan_lokasi')) {
                $table->string('catatan_lokasi')->nullable()->after('alamat_lengkap');
            }
            
            // 3. Biaya (Ini yang bikin error tadi, kita kasih pengecekan)
            if (!Schema::hasColumn('transaksis', 'distance_km')) {
                $table->float('distance_km', 8, 2)->default(0)->after('catatan_lokasi');
            }
            if (!Schema::hasColumn('transaksis', 'shipping_cost')) {
                $table->decimal('shipping_cost', 15, 2)->default(0)->after('distance_km');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transaksis', function (Blueprint $table) {
            // Hapus kalau ada
            $columns = ['customer_lat', 'customer_lng', 'alamat_lengkap', 'catatan_lokasi', 'distance_km', 'shipping_cost'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('transaksis', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};