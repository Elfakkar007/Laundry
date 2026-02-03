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
        Schema::table('surcharges', function (Blueprint $table) {
            // Add category column to differentiate between regular surcharge and shipping
            $table->enum('category', ['surcharge', 'shipping'])
                ->default('surcharge')
                ->after('calculation_type');
        });

        // Update existing delivery/shipping related surcharges to 'shipping' category
        DB::table('surcharges')
            ->where('nama', 'LIKE', '%kirim%')
            ->orWhere('nama', 'LIKE', '%antar%')
            ->orWhere('nama', 'LIKE', '%delivery%')
            ->orWhere('nama', 'LIKE', '%shipping%')
            ->update(['category' => 'shipping']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('surcharges', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};