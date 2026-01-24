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
        Schema::create('detail_transaksis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_transaksi')->constrained('transaksis')->cascadeOnDelete();
            $table->foreignId('id_paket')->constrained('pakets')->cascadeOnDelete();
            $table->decimal('qty', 10, 2);
            $table->text('keterangan')->nullable();
            $table->timestamps();
            
            $table->index('id_transaksi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detail_transaksis');
    }
};