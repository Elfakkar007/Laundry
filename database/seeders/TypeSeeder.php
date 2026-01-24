<?php

namespace Database\Seeders;

use App\Models\PackageType;
use Illuminate\Database\Seeder;

class TypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            'Kiloan',
            'Selimut',
            'Bed Cover',
            'Kaos',
        ];

        foreach ($types as $type) {
            PackageType::firstOrCreate(['nama' => $type]);
        }

        $this->command->info('Package Types seeded successfully!');
    }
}