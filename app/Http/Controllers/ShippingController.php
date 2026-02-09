<?php

namespace App\Http\Controllers;

use App\Models\Surcharge;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * INSTRUKSI:
 * Replace file ini ke: app/Http/Controllers/ShippingController.php
 * 
 * Controller ini sekarang HANYA menggunakan shipping dari Surcharges (global),
 * bukan dari outlet.price_per_km
 */
class ShippingController extends Controller
{
    /**
     * Calculate shipping cost based on Surcharge shipping options
     */
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'outlet_id' => 'required|exists:outlets,id',
            'customer_lat' => 'required|numeric|between:-90,90',
            'customer_lng' => 'required|numeric|between:-180,180',
            'shipping_id' => 'nullable|exists:surcharges,id', // Optional: specific shipping option
        ]);

        try {
            $outlet = Outlet::findOrFail($validated['outlet_id']);

            // Calculate distance using Haversine formula
            $distance = $this->calculateDistance(
                $outlet->latitude,
                $outlet->longitude,
                $validated['customer_lat'],
                $validated['customer_lng']
            );

            // If specific shipping_id provided, use that. Otherwise, use first active distance-based shipping
            if (isset($validated['shipping_id'])) {
                $shipping = Surcharge::findOrFail($validated['shipping_id']);
            } else {
                // Find first active distance-based shipping
                $shipping = Surcharge::where('is_active', true)
                    ->where('category', 'shipping')
                    ->where('calculation_type', 'distance')
                    ->first();
                
                if (!$shipping) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tidak ada opsi ongkir berbasis jarak yang aktif. Silakan atur di Biaya & Ongkir.'
                    ], 400);
                }
            }

            // Validate it's a shipping type
            if ($shipping->category !== 'shipping') {
                return response()->json([
                    'success' => false,
                    'message' => 'Surcharge yang dipilih bukan tipe ongkir'
                ], 400);
            }

            // Calculate cost
            $cost = 0;
            if ($shipping->calculation_type === 'distance') {
                $cost = $shipping->nominal * $distance;
            } elseif ($shipping->calculation_type === 'fixed') {
                $cost = $shipping->nominal;
            } elseif ($shipping->calculation_type === 'percent') {
                // For percent, we can't calculate without subtotal, return 0
                $cost = 0;
            }

            return response()->json([
                'success' => true,
                'distance' => round($distance, 2),
                'cost' => $cost,
                'price_per_km' => $shipping->calculation_type === 'distance' ? $shipping->nominal : 0,
                'shipping_name' => $shipping->nama,
                'outlet_name' => $outlet->nama
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in kilometers
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371; // Radius of the Earth in kilometers

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}