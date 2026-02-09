<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // Existing settings
            [
                'key' => 'tax_rate',
                'value' => '11',
                'type' => 'number',
                'description' => 'Persentase pajak (PPN) yang dikenakan pada transaksi',
            ],
            [
                'key' => 'auto_apply_tax',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Otomatis terapkan pajak pada setiap transaksi',
            ],
            
            // Points System Settings
            [
                'key' => 'points_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Aktifkan sistem poin member',
            ],
            [
                'key' => 'points_earn_ratio',
                'value' => '10000',
                'type' => 'number',
                'description' => 'Kelipatan nominal belanja untuk dapat 1 poin (Rp)',
            ],
            [
                'key' => 'points_redeem_value',
                'value' => '500',
                'type' => 'number',
                'description' => 'Nilai tukar 1 poin dalam Rupiah',
            ],
            
            // 🆕 Auto-Member Settings
            [
                'key' => 'auto_member_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Aktifkan upgrade otomatis ke member setelah transaksi tertentu',
            ],
            [
                'key' => 'auto_member_transaction_count',
                'value' => '5',
                'type' => 'number',
                'description' => 'Jumlah transaksi yang dibutuhkan untuk upgrade otomatis ke member',
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('Settings seeded successfully!');
    }
}