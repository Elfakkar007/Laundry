<?php

namespace App\Helpers;

class AuthorizationHelper
{
    /**
     * Check if current user can perform action
     */
    public static function can(string $permission): bool
    {
        return auth()->check() && auth()->user()->can($permission);
    }

    /**
     * Check if current user has role
     */
    public static function hasRole(string|array $roles): bool
    {
        return auth()->check() && auth()->user()->hasRole($roles);
    }

    /**
     * Check if current user is admin
     */
    public static function isAdmin(): bool
    {
        return auth()->check() && auth()->user()->hasRole('admin');
    }

    /**
     * Check if current user is kasir
     */
    public static function isKasir(): bool
    {
        return auth()->check() && auth()->user()->hasRole('kasir');
    }

    /**
     * Check if current user is owner
     */
    public static function isOwner(): bool
    {
        return auth()->check() && auth()->user()->hasRole('owner');
    }

    /**
     * Get current user's outlet ID
     */
    public static function getOutletId(): ?int
    {
        return auth()->check() ? auth()->user()->id_outlet : null;
    }

    /**
     * Check if user has global access (no outlet restriction)
     */
    public static function hasGlobalAccess(): bool
    {
        if (!auth()->check()) {
            return false;
        }

        $user = auth()->user();
        return $user->hasRole(['admin', 'owner']) && $user->id_outlet === null;
    }

    /**
     * Get accessible outlet IDs for current user
     */
    public static function getAccessibleOutletIds(): array
    {
        if (!auth()->check()) {
            return [];
        }

        $user = auth()->user();

        // Admin & Owner dengan id_outlet null = akses semua
        if ($user->hasRole(['admin', 'owner']) && $user->id_outlet === null) {
            return \App\Models\Outlet::pluck('id')->toArray();
        }

        // User dengan outlet spesifik
        return $user->id_outlet ? [$user->id_outlet] : [];
    }
}