<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kolom pajak sebelumnya decimal(5,2) = max 999.99, menyebabkan overflow
     * saat nilai pajak besar (mis. 30717.5). Diubah ke decimal(15,2) seperti
     * biaya_tambahan dan diskon.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transaksis ALTER COLUMN pajak TYPE NUMERIC(15, 2) USING pajak::numeric(15,2)');
            DB::statement('ALTER TABLE transaksis ALTER COLUMN pajak SET DEFAULT 0');
        } else {
            DB::statement('ALTER TABLE transaksis MODIFY pajak DECIMAL(15, 2) DEFAULT 0');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transaksis ALTER COLUMN pajak TYPE NUMERIC(5, 2) USING pajak::numeric(5,2)');
            DB::statement('ALTER TABLE transaksis ALTER COLUMN pajak SET DEFAULT 0');
        } else {
            DB::statement('ALTER TABLE transaksis MODIFY pajak DECIMAL(5, 2) DEFAULT 0');
        }
    }
};
