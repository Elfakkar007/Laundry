<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,      // 1. Setup roles & permissions dulu
            OutletSeeder::class,    // 2. Buat outlet
            TypeSeeder::class,      // 3. Buat package types
            UserSeeder::class,      // 4. Buat users dengan role
            SettingSeeder::class,   // 5. Buat setting awal
        ]);

        $this->command->info('🚀 Database seeding completed successfully!');
    }
}