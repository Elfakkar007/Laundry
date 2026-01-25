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
        // Step 1: Create new customers table
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('no_hp')->unique();
            $table->text('alamat')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_member')->default(false);
            $table->integer('poin')->default(0);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->index('no_hp');
            $table->index('nama');
            $table->index('is_member');
        });

        // Step 2: Migrate existing data from members to customers
        if (Schema::hasTable('members')) {
            DB::statement('
                INSERT INTO customers (id, nama, no_hp, alamat, is_member, poin, created_at, updated_at)
                SELECT 
                    id, 
                    nama, 
                    tlp as no_hp, 
                    alamat,
                    false as is_member,
                    0 as poin,
                    created_at, 
                    updated_at
                FROM members
            ');

            // Step 3: Update foreign key references in transaksis table
            Schema::table('transaksis', function (Blueprint $table) {
                $table->dropForeign(['id_member']);
                $table->renameColumn('id_member', 'id_customer');
            });

            Schema::table('transaksis', function (Blueprint $table) {
                $table->foreign('id_customer')->references('id')->on('customers')->cascadeOnDelete();
            });

            // Step 4: Drop old members table
            Schema::dropIfExists('members');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate members table
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->text('alamat');
            $table->string('jenis_kelamin', 1);
            $table->string('tlp', 20);
            $table->timestamps();
            
            $table->index('nama');
            $table->index('tlp');
        });

        // Migrate data back
        if (Schema::hasTable('customers')) {
            DB::statement('
                INSERT INTO members (id, nama, alamat, jenis_kelamin, tlp, created_at, updated_at)
                SELECT 
                    id, 
                    nama, 
                    COALESCE(alamat, ""), 
                    "L" as jenis_kelamin,
                    no_hp as tlp,
                    created_at, 
                    updated_at
                FROM customers
            ');

            // Update foreign key back
            Schema::table('transaksis', function (Blueprint $table) {
                $table->dropForeign(['id_customer']);
                $table->renameColumn('id_customer', 'id_member');
            });

            Schema::table('transaksis', function (Blueprint $table) {
                $table->foreign('id_member')->references('id')->on('members')->cascadeOnDelete();
            });

            Schema::dropIfExists('customers');
        }
    }
};