<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Drops the `email` column from `customers`.
     * The column is no longer collected at point-of-sale; historical
     * values are intentionally discarded because the cashier workflow
     * no longer surfaces email anywhere.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Re-adds `email` as a nullable string so existing data is not
     * lost if the migration is rolled back.  Previously stored values
     * cannot be restored from this migration alone.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('email', 255)->nullable()->after('alamat');
        });
    }
};