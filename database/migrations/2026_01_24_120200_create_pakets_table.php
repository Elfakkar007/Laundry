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
        Schema::create('pakets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_outlet')->constrained('outlets')->cascadeOnDelete();
            $table->foreignId('id_package_type')->constrained('package_types')->cascadeOnDelete();
            $table->string('nama_paket');
            $table->decimal('harga', 15, 2);
            $table->timestamps();
            
            $table->index(['id_outlet', 'id_package_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pakets');
    }
};