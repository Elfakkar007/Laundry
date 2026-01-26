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

// Dashboard Route - All authenticated users
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

// Protected Routes - Require Authentication
Route::middleware(['auth', 'verified'])->group(function () {
    
    // Profile Routes - Available to all authenticated users
    Route::prefix('profile')->name('profile.')->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('update');
        Route::delete('/', [ProfileController::class, 'destroy'])->name('destroy');
    });
    
    // ========================================
    // USER MANAGEMENT - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->middleware('permission:user.view')
            ->name('index');
        
        Route::post('/', [UserController::class, 'store'])
            ->middleware('permission:user.create')
            ->name('store');
        
        Route::put('/{user}', [UserController::class, 'update'])
            ->middleware('permission:user.update')
            ->name('update');
        
        Route::delete('/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:user.delete')
            ->name('destroy');
    });
    
    // ========================================
    // OUTLET MANAGEMENT - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->prefix('outlets')->name('outlets.')->group(function () {
        Route::get('/', [OutletController::class, 'index'])
            ->middleware('permission:outlet.view')
            ->name('index');
        
        Route::post('/', [OutletController::class, 'store'])
            ->middleware('permission:outlet.create')
            ->name('store');
        
        Route::put('/{outlet}', [OutletController::class, 'update'])
            ->middleware('permission:outlet.update')
            ->name('update');
        
        Route::delete('/{outlet}', [OutletController::class, 'destroy'])
            ->middleware('permission:outlet.delete')
            ->name('destroy');
    });
    
    // ========================================
    // PACKAGE TYPE MANAGEMENT - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->prefix('package-types')->name('package-types.')->group(function () {
        Route::get('/', [PackageTypeController::class, 'index'])
            ->middleware('permission:paket.view')
            ->name('index');
        
        Route::post('/', [PackageTypeController::class, 'store'])
            ->middleware('permission:paket.create')
            ->name('store');
        
        Route::put('/{packageType}', [PackageTypeController::class, 'update'])
            ->middleware('permission:paket.update')
            ->name('update');
        
        Route::delete('/{packageType}', [PackageTypeController::class, 'destroy'])
            ->middleware('permission:paket.delete')
            ->name('destroy');
    });
    
    // ========================================
    // PAKET MANAGEMENT - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->prefix('pakets')->name('pakets.')->group(function () {
        Route::get('/', [PaketController::class, 'index'])
            ->middleware('permission:paket.view')
            ->name('index');
        
        Route::post('/', [PaketController::class, 'store'])
            ->middleware('permission:paket.create')
            ->name('store');
        
        Route::put('/{paket}', [PaketController::class, 'update'])
            ->middleware('permission:paket.update')
            ->name('update');
        
        Route::delete('/{paket}', [PaketController::class, 'destroy'])
            ->middleware('permission:paket.delete')
            ->name('destroy');
    });
    
    // ========================================
    // CUSTOMER MANAGEMENT - Admin & Kasir
    // ========================================
    Route::middleware(['role:admin|kasir'])->prefix('customers')->name('customers.')->group(function () {
        Route::get('/', [CustomerController::class, 'index'])
            ->middleware('permission:customer.view')
            ->name('index');
        
        Route::post('/', [CustomerController::class, 'store'])
            ->middleware('permission:customer.create')
            ->name('store');
        
        Route::put('/{customer}', [CustomerController::class, 'update'])
            ->middleware('permission:customer.update')
            ->name('update');
        
        Route::delete('/{customer}', [CustomerController::class, 'destroy'])
            ->middleware('permission:customer.delete')
            ->name('destroy');
        
        Route::post('/{customer}/toggle-member', [CustomerController::class, 'toggleMember'])
            ->middleware('permission:customer.update')
            ->name('toggle-member');
    });

    // ========================================
    // SETTINGS - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingController::class, 'index'])
            ->middleware('permission:setting.view')
            ->name('index');
        
        Route::put('/{setting}', [SettingController::class, 'update'])
            ->middleware('permission:setting.update')
            ->name('update');
        
        Route::post('/bulk-update', [SettingController::class, 'bulkUpdate'])
            ->middleware('permission:setting.update')
            ->name('bulk-update');
    });

    // ========================================
    // FINANCE - Surcharges & Promos - Admin Only
    // ========================================
    Route::middleware(['role:admin'])->group(function () {
        
        // Surcharges
        Route::prefix('surcharges')->name('surcharges.')->group(function () {
            Route::get('/', [SurchargeController::class, 'index'])
                ->middleware('permission:finance.view')
                ->name('index');
            
            Route::post('/', [SurchargeController::class, 'store'])
                ->middleware('permission:finance.manage')
                ->name('store');
            
            Route::put('/{surcharge}', [SurchargeController::class, 'update'])
                ->middleware('permission:finance.manage')
                ->name('update');
            
            Route::delete('/{surcharge}', [SurchargeController::class, 'destroy'])
                ->middleware('permission:finance.manage')
                ->name('destroy');
            
            Route::post('/{surcharge}/toggle-active', [SurchargeController::class, 'toggleActive'])
                ->middleware('permission:finance.manage')
                ->name('toggle-active');
        });

        // Promos
        Route::prefix('promos')->name('promos.')->group(function () {
            Route::get('/', [PromoController::class, 'index'])
                ->middleware('permission:finance.view')
                ->name('index');
            
            Route::post('/', [PromoController::class, 'store'])
                ->middleware('permission:finance.manage')
                ->name('store');
            
            Route::put('/{promo}', [PromoController::class, 'update'])
                ->middleware('permission:finance.manage')
                ->name('update');
            
            Route::delete('/{promo}', [PromoController::class, 'destroy'])
                ->middleware('permission:finance.manage')
                ->name('destroy');
            
            Route::post('/{promo}/toggle-active', [PromoController::class, 'toggleActive'])
                ->middleware('permission:finance.manage')
                ->name('toggle-active');
        });
    });
});

require __DIR__.'/auth.php';