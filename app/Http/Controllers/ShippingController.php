<?php

namespace App\Http\Controllers;

use App\Services\ShippingCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ShippingController extends Controller
{
    protected $shippingCalculator;

    public function __construct(ShippingCalculatorService $shippingCalculator)
    {
        $this->shippingCalculator = $shippingCalculator;
    }

    /**
     * Calculate shipping cost
     */
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'outlet_id' => 'required|exists:outlets,id',
            'customer_lat' => 'required|numeric|between:-90,90',
            'customer_lng' => 'required|numeric|between:-180,180',
        ]);

        try {
            $result = $this->shippingCalculator->calculateShipping(
                $validated['outlet_id'],
                $validated['customer_lat'],
                $validated['customer_lng']
            );

            return response()->json([
                'success' => true,
                'distance' => $result['distance'],
                'cost' => $result['cost'],
                'price_per_km' => $result['price_per_km'],
                'outlet_name' => $result['outlet']->nama
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}