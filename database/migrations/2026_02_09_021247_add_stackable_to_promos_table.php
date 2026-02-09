<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('promos', function (Blueprint $table) {
            // Add stackable column - default true for backward compatibility
            $table->boolean('is_stackable')->default(true)->after('is_active');
            
            // Add priority column - default 100 (lower = higher priority)
            $table->integer('priority')->default(100)->after('is_stackable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promos', function (Blueprint $table) {
            $table->dropColumn(['is_stackable', 'priority']);
        });
    }
};