<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\OutletController;
use App\Http\Controllers\PackageTypeController;
use App\Http\Controllers\PaketController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SurchargeController;
use App\Http\Controllers\PromoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Redirect root ke login
Route::get('/', function () {
    return redirect()->route('login');
});

// Dashboard Route dengan Controller
Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // User Management Routes (Admin Only)
    Route::middleware(['permission:user.view'])->group(function () {
        Route::resource('users', UserController::class)->except(['create', 'show', 'edit']);
    });
    
    // Master Data Routes
    Route::middleware(['permission:outlet.view'])->group(function () {
        Route::resource('outlets', OutletController::class)->except(['create', 'show', 'edit']);
    });
    
    Route::middleware(['permission:paket.view'])->group(function () {
        Route::resource('package-types', PackageTypeController::class)->except(['create', 'show', 'edit']);
        Route::resource('pakets', PaketController::class)->except(['create', 'show', 'edit']);
    });
    
    // Customer Routes (Admin & Kasir)
    Route::middleware(['permission:customer.view'])->group(function () {
        Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
        Route::post('customers/{customer}/toggle-member', [CustomerController::class, 'toggleMember'])
            ->name('customers.toggle-member');
    });

    // Settings (Admin Only)
    Route::middleware(['permission:setting.view'])->group(function () {
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [SettingController::class, 'index'])->name('index');
            Route::put('/{setting}', [SettingController::class, 'update'])->name('update');
            Route::post('/bulk-update', [SettingController::class, 'bulkUpdate'])->name('bulk-update');
        });
    });

    // Finance Routes (Admin Only)
    Route::middleware(['permission:finance.view'])->group(function () {
        Route::resource('surcharges', SurchargeController::class)->except(['create', 'show', 'edit']);
        Route::post('surcharges/{surcharge}/toggle-active', [SurchargeController::class, 'toggleActive'])
            ->name('surcharges.toggle-active');

        Route::resource('promos', PromoController::class)->except(['create', 'show', 'edit']);
        Route::post('promos/{promo}/toggle-active', [PromoController::class, 'toggleActive'])
            ->name('promos.toggle-active');
    });
});

require __DIR__.'/auth.php';