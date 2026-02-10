<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ActivityLogPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create permission
        $permission = Permission::firstOrCreate(['name' => 'activity-log.view']);

        // Assign to admin and owner roles
        $adminRole = Role::where('name', 'admin')->first();
        $ownerRole = Role::where('name', 'owner')->first();

        if ($adminRole) {
            $adminRole->givePermissionTo($permission);
        }

        if ($ownerRole) {
            $ownerRole->givePermissionTo($permission);
        }

        $this->command->info('Activity Log permission created and assigned to admin and owner roles.');
    }
}
