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
                'key' => 'company_name',
                'value' => 'Laundry Bersih',
                'type' => 'string',
                'description' => 'Nama perusahaan yang muncul di laporan dan struk',
            ],
            [
                'key' => 'company_phone',
                'value' => '021-12345678',
                'type' => 'string',
                'description' => 'Nomor telepon perusahaan',
            ],
            [
                'key' => 'company_address',
                'value' => 'Jl. Merdeka No. 123, Jakarta Pusat',
                'type' => 'string',
                'description' => 'Alamat perusahaan',
            ],
            [
                'key' => 'auto_apply_tax',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Otomatis terapkan pajak pada setiap transaksi',
            ],
            [
                'key' => 'member_discount_percent',
                'value' => '5',
                'type' => 'number',
                'description' => 'Diskon otomatis untuk member (%)',
            ],
            [
                'key' => 'points_per_transaction',
                'value' => '100',
                'type' => 'number',
                'description' => 'Poin yang didapat member per Rp 100.000 transaksi',
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