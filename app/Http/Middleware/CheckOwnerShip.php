<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckOwnership
{
    /**
     * Handle an incoming request.
     *
     * Middleware untuk memastikan user hanya bisa akses data di outlet mereka
     * (kecuali admin yang punya akses global)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Admin bypass semua check (global access)
        if ($user->hasRole('admin')) {
            return $next($request);
        }

        // Owner juga punya global access (optional, tergantung requirement)
        if ($user->hasRole('owner')) {
            return $next($request);
        }

        // Kasir harus punya outlet
        if ($user->hasRole('kasir') && !$user->id_outlet) {
            abort(403, 'Kasir harus ditugaskan ke outlet tertentu.');
        }

        return $next($request);
    }
}