<?php

namespace Database\Seeders;

use App\Models\Outlet;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $outlet = Outlet::first();

        // Owner (tidak terikat outlet spesifik - id_outlet nullable)
        $owner = User::create([
            'nama' => 'Owner Laundry',
            'username' => 'owner',
            'password' => Hash::make('password'),
            'id_outlet' => null, // Owner bisa akses semua outlet
        ]);
        $owner->assignRole('owner');

        // Admin (terikat ke outlet tertentu)
        $admin = User::create([
            'nama' => 'Admin Outlet',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'id_outlet' => $outlet->id,
        ]);
        $admin->assignRole('admin');

        // Kasir (terikat ke outlet tertentu)
        $kasir = User::create([
            'nama' => 'Kasir Outlet',
            'username' => 'kasir',
            'password' => Hash::make('password'),
            'id_outlet' => $outlet->id,
        ]);
        $kasir->assignRole('kasir');

        $this->command->info('Users seeded successfully!');
        $this->command->info('Login Credentials:');
        $this->command->info('Owner - username: owner, password: password');
        $this->command->info('Admin - username: admin, password: password');
        $this->command->info('Kasir - username: kasir, password: password');
    }
}