<?php

namespace Database\Seeders;

use App\Models\Outlet;
use Illuminate\Database\Seeder;

class OutletSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Outlet::create([
            'nama' => 'Laundry Bersih Cabang Pusat',
            'alamat' => 'Jl. Merdeka No. 123, Jakarta Pusat',
            'tlp' => '021-12345678',
        ]);

        $this->command->info('Outlet seeded successfully!');
    }
}