<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. REFACTOR SETTINGS - Remove redundant settings
        DB::table('settings')->whereIn('key', [
            'company_name',
            'company_phone',
            'company_address',
            'points_per_transaction'
        ])->delete();

        // 2. UPGRADE SURCHARGES TABLE
        Schema::table('surcharges', function (Blueprint $table) {
            // Drop old jenis column
            $table->dropColumn('jenis');
            
            // Add new calculation_type column
            $table->enum('calculation_type', ['fixed', 'percent', 'distance'])
                ->default('fixed')
                ->after('nominal');
            
            // Add min_order_total for free shipping logic
            $table->unsignedBigInteger('min_order_total')
                ->nullable()
                ->after('calculation_type');
            
            // Add index for performance
            $table->index(['is_active', 'calculation_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore settings
        DB::table('settings')->insert([
            [
                'key' => 'company_name',
                'value' => 'Laundry Bersih',
                'type' => 'string',
                'description' => 'Nama perusahaan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'company_phone',
                'value' => '021-12345678',
                'type' => 'string',
                'description' => 'Nomor telepon perusahaan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'company_address',
                'value' => 'Jakarta',
                'type' => 'string',
                'description' => 'Alamat perusahaan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'points_per_transaction',
                'value' => '100',
                'type' => 'number',
                'description' => 'Poin per transaksi',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // Revert surcharges table
        Schema::table('surcharges', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'calculation_type']);
            $table->dropColumn(['calculation_type', 'min_order_total']);
            
            $table->enum('jenis', ['fixed', 'percent'])
                ->default('fixed')
                ->after('nominal');
        });
    }
};