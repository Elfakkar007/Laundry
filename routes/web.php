<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\OutletController;
use App\Http\Controllers\PackageTypeController;
use App\Http\Controllers\PaketController;
use App\Http\Controllers\CustomerController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SurchargeController;
use App\Http\Controllers\PromoController;
use Inertia\Inertia;

// Redirect root ke login
Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Master Data Routes
    Route::resource('outlets', OutletController::class)->except(['create', 'show', 'edit']);
    Route::resource('package-types', PackageTypeController::class)->except(['create', 'show', 'edit']);
    Route::resource('pakets', PaketController::class)->except(['create', 'show', 'edit']);
    
    // Customer Routes (menggantikan members)
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::post('customers/{customer}/toggle-member', [CustomerController::class, 'toggleMember'])
        ->name('customers.toggle-member');

    // Settings
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingController::class, 'index'])->name('index');
        Route::put('/{setting}', [SettingController::class, 'update'])->name('update');
        Route::post('/bulk-update', [SettingController::class, 'bulkUpdate'])->name('bulk-update');
    });

    // Surcharges
    Route::resource('surcharges', SurchargeController::class)->except(['create', 'show', 'edit']);
    Route::post('surcharges/{surcharge}/toggle-active', [SurchargeController::class, 'toggleActive'])
        ->name('surcharges.toggle-active');

    // Promos
    Route::resource('promos', PromoController::class)->except(['create', 'show', 'edit']);
    Route::post('promos/{promo}/toggle-active', [PromoController::class, 'toggleActive'])
        ->name('promos.toggle-active');
    });

require __DIR__.'/auth.php';