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
        // 1. Add points settings to settings table (via seeder)
        // 2. Create points history table
        Schema::create('point_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_customer')->constrained('customers')->cascadeOnDelete();
            $table->enum('type', ['earn', 'redeem', 'adjustment']); // earn = dapat, redeem = tukar, adjustment = koreksi admin
            $table->integer('points'); // Bisa positif atau negatif
            $table->decimal('transaction_amount', 15, 2)->nullable(); // Jumlah belanja (untuk type=earn)
            $table->string('reference_type')->nullable(); // 'transaksi', 'manual', dll
            $table->unsignedBigInteger('reference_id')->nullable(); // ID transaksi jika ada
            $table->text('notes')->nullable(); // Catatan
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); // Admin yang input
            $table->timestamps();
            
            $table->index(['id_customer', 'created_at']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_histories');
    }
};