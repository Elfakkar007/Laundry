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
        Schema::create('transaksis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_outlet')->constrained('outlets')->cascadeOnDelete();
            $table->string('kode_invoice')->unique();
            $table->foreignId('id_customer')->constrained('customers')->cascadeOnDelete();
            $table->timestamp('tgl');
            $table->timestamp('batas_waktu');
            $table->timestamp('tgl_bayar')->nullable();
            $table->decimal('biaya_tambahan', 15, 2)->default(0);
            $table->decimal('diskon', 15, 2)->default(0);
            $table->decimal('pajak', 5, 2)->default(0);
            $table->string('status', 50)->default('baru'); // baru, proses, selesai, diambil
            $table->string('dibayar', 50)->default('belum_dibayar'); // belum_dibayar, dibayar
            $table->foreignId('id_user')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index('kode_invoice');
            $table->index(['id_outlet', 'status']);
            $table->index('tgl');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaksis');
    }
};