<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            if (!Schema::hasColumn('outlets', 'latitude')) {
                $table->decimal('latitude', 10, 8)->nullable()->after('tlp');
            }
            if (!Schema::hasColumn('outlets', 'longitude')) {
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            }
            if (!Schema::hasColumn('outlets', 'price_per_km')) {
                $table->unsignedBigInteger('price_per_km')->default(0)->after('longitude');
            }
        });

        Schema::table('transaksis', function (Blueprint $table) {
            if (!Schema::hasColumn('transaksis', 'distance_km')) {
                $table->float('distance_km', 8, 2)->nullable()->after('biaya_tambahan');
            }
            if (!Schema::hasColumn('transaksis', 'shipping_cost')) {
                $table->decimal('shipping_cost', 15, 2)->default(0)->after('distance_km');
            }
            if (!Schema::hasColumn('transaksis', 'shipping_address_lat')) {
                $table->decimal('shipping_address_lat', 10, 8)->nullable()->after('shipping_cost');
            }
            if (!Schema::hasColumn('transaksis', 'shipping_address_lng')) {
                $table->decimal('shipping_address_lng', 11, 8)->nullable()->after('shipping_address_lat');
            }
            if (!Schema::hasColumn('transaksis', 'shipping_address_text')) {
                $table->text('shipping_address_text')->nullable()->after('shipping_address_lng');
            }
        });
    }

    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $columns = ['latitude', 'longitude', 'price_per_km'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('outlets', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $columns = [
                'distance_km',
                'shipping_cost',
                'shipping_address_lat',
                'shipping_address_lng',
                'shipping_address_text'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('transaksis', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};