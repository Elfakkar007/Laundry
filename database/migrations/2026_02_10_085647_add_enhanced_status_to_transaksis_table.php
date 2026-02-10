<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration adds support for enhanced status workflow:
     * - New statuses: 'batal', 'dikirim', 'diterima'
     * - Existing statuses remain: 'baru', 'proses', 'selesai', 'diambil'
     */
    public function up(): void
    {
        // No schema changes needed - status column already exists as string
        // The new status values ('batal', 'dikirim', 'diterima') can be used directly
        
        // This migration serves as documentation that these new statuses are now supported
        // and ensures the migration history reflects when this feature was added
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No schema changes to revert
        // Note: If reverting, you may want to update any transactions using new statuses
        // back to old statuses manually via a data migration
    }
};
