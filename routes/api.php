<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShippingController;

Route::middleware(['web', 'auth'])->group(function () {
    Route::post('/calculate-shipping', [ShippingController::class, 'calculate']);
});