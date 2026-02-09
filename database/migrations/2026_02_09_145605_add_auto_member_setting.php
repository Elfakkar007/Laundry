<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Setting;

return new class extends Migration
{
    public function up(): void
    {
        Setting::create([
            'key' => 'auto_member_enabled',
            'value' => 'true',
            'type' => 'boolean',
            'description' => 'Aktifkan upgrade otomatis ke member setelah transaksi tertentu',
        ]);

        Setting::create([
            'key' => 'auto_member_transaction_count',
            'value' => '5',
            'type' => 'number',
            'description' => 'Jumlah transaksi yang dibutuhkan untuk upgrade otomatis ke member',
        ]);
    }

    public function down(): void
    {
        Setting::whereIn('key', [
            'auto_member_enabled',
            'auto_member_transaction_count',
        ])->delete();
    }
};