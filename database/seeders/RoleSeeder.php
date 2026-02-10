<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Daftar Permission Lengkap (Sesuai Fitur Kita)
        $permissions = [
            // Dashboard
            'dashboard.view',

            // Outlet Management (Admin Only)
            'outlet.view', 'outlet.create', 'outlet.update', 'outlet.delete',
            
            // User Management (Admin Only)
            'user.view', 'user.create', 'user.update', 'user.delete',
            
            // Produk/Paket Management (Admin Only)
            'paket.view', 'paket.create', 'paket.update', 'paket.delete',
            
            // Member/Customer (Admin & Kasir)
            'customer.view', 'customer.create', 'customer.update', 'customer.delete',
            
            // Transaksi (Admin & Kasir)
            'transaksi.view', 'transaksi.create', 'transaksi.detail', 'transaksi.edit', // Update/Delete dilarang di laundry biasanya, kecuali void
            
            // Laporan (Semua akses tapi beda scope)
            'report.view',
            
            // Log Aktivitas (Admin Only)
            'log.view',

            // Keuangan & Setting (Admin Only - NEW FEATURE)
            'setting.view', 'setting.update',     // Untuk Pajak & Identitas Toko
            'finance.view', 'finance.manage',     // Untuk Surcharges & Promos
        ];

        // Buat Permission ke DB
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // 3. Buat Roles & Assign Permission
        
        // --- ROLE ADMIN (Super Power) ---
        // Sesuai Soal: Admin bisa segalanya (CRUD Outlet, Produk, Pengguna, Transaksi, Laporan)
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        // --- ROLE KASIR (Operator) ---
        // Sesuai Soal: Registrasi Pelanggan, Entri Transaksi.
        // Kasir TIDAK BOLEH akses menu User, Outlet, atau Setting.
        $kasirRole = Role::firstOrCreate(['name' => 'kasir']);
        $kasirRole->givePermissionTo([
            'dashboard.view',
            'customer.view', 'customer.create', 'customer.update', // Registrasi Pelanggan
            'paket.view', // Hanya lihat paket untuk transaksi
            'transaksi.view', 'transaksi.create', 'transaksi.detail', 'transaksi.edit', // Entri Transaksi + Update Status
            'report.view', // Laporan shift dia sendiri (opsional)
        ]);

        // --- ROLE OWNER (Pemilik) ---
        // Sesuai Soal: Hanya "Generate Laporan".
        // Owner biasanya hanya memantau, tidak input data.
        $ownerRole = Role::firstOrCreate(['name' => 'owner']);
        $ownerRole->givePermissionTo([
            'dashboard.view',
            'report.view',
            'log.view', // Nice to have: Owner bisa lihat siapa yang nakal
            'outlet.view', // Lihat data outlet boleh
        ]);
        
        $this->command->info('Roles and Permissions seeded successfully with Fixed Logic!');
    }
}