<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\OutletController;
use App\Http\Controllers\PackageTypeController;
use App\Http\Controllers\PaketController;
use Illuminate\Support\Facades\Route;
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
});

require __DIR__.'/auth.php';