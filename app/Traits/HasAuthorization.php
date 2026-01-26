<?php

namespace App\Traits;

use Illuminate\Auth\Access\AuthorizationException;

trait HasAuthorization
{
    /**
     * Authorize permission atau throw exception
     */
    protected function authorizePermission(string $permission): void
    {
        if (!auth()->user()->can($permission)) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Authorize role atau throw exception
     */
    protected function authorizeRole(string|array $roles): void
    {
        if (!auth()->user()->hasRole($roles)) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Check permission (return boolean)
     */
    protected function hasPermission(string $permission): bool
    {
        return auth()->user()->can($permission);
    }

    /**
     * Check role (return boolean)
     */
    protected function hasRole(string|array $roles): bool
    {
        return auth()->user()->hasRole($roles);
    }

    /**
     * Authorize any permission dari array
     */
    protected function authorizeAnyPermission(array $permissions): void
    {
        if (!auth()->user()->hasAnyPermission($permissions)) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Authorize all permissions dari array
     */
    protected function authorizeAllPermissions(array $permissions): void
    {
        if (!auth()->user()->hasAllPermissions($permissions)) {
            abort(403, 'Unauthorized action.');
        }
    }
}