<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
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
            [
                'key' => 'member_discount',
                'value' => '0',
                'type' => 'number',
                'description' => 'Persentase diskon otomatis untuk member (%)',
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