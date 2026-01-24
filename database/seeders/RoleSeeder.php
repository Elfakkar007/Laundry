<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Buat Roles
        $roles = [
            'owner',
            'admin',
            'kasir',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // Buat Permissions (opsional, bisa disesuaikan kebutuhan)
        $permissions = [
            // Outlet Management
            'outlet.view',
            'outlet.create',
            'outlet.update',
            'outlet.delete',
            
            // User Management
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            
            // Package Management
            'paket.view',
            'paket.create',
            'paket.update',
            'paket.delete',
            
            // Member Management
            'member.view',
            'member.create',
            'member.update',
            'member.delete',
            
            // Transaksi Management
            'transaksi.view',
            'transaksi.create',
            'transaksi.update',
            'transaksi.delete',
            
            // Report
            'report.view',
            
            // Log
            'log.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    
        // Assign Permissions ke Roles
        $ownerRole = Role::findByName('admin');
        $ownerRole->givePermissionTo(Permission::all()); // Owner mendapat semua permission

        $adminRole = Role::findByName('owner');
        $adminRole->givePermissionTo([
          'report.view', 'log.view',
        ]);

        $kasirRole = Role::findByName('kasir');
        $kasirRole->givePermissionTo([
            'member.view', 'member.create',
            'transaksi.view', 'transaksi.create', 'transaksi.update',
            'paket.view',
        ]);

        $this->command->info('Roles and Permissions seeded successfully!');
    }
}