<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to remove price_per_km from outlets table
 * 
 * INSTRUKSI:
 * 1. Salin file ini ke: database/migrations/[timestamp]_remove_price_per_km_from_outlets_table.php
 * 2. Jalankan: php artisan migrate
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropColumn('price_per_km');
        });
    }

    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->integer('price_per_km')->default(0)->after('longitude');
        });
    }
};