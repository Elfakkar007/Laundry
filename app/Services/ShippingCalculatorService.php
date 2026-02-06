<?php

namespace App\Services;

class ShippingCalculatorService
{
    /**
     * Calculate distance between two coordinates using Haversine formula
     * 
     * @param float $lat1 Latitude of point 1
     * @param float $lon1 Longitude of point 1
     * @param float $lat2 Latitude of point 2
     * @param float $lon2 Longitude of point 2
     * @return float Distance in kilometers
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371; // Earth's radius in kilometers

        $latFrom = deg2rad($lat1);
        $lonFrom = deg2rad($lon1);
        $latTo = deg2rad($lat2);
        $lonTo = deg2rad($lon2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)
        ));

        return round($angle * $earthRadius, 2);
    }

    /**
     * Calculate shipping cost based on distance and price per km
     * 
     * @param float $distance Distance in kilometers
     * @param int $pricePerKm Price per kilometer
     * @return float Total shipping cost
     */
    public function calculateCost(float $distance, int $pricePerKm): float
    {
        return round($distance * $pricePerKm, 2);
    }

    /**
     * Calculate shipping details for a transaction
     * 
     * @param int $outletId
     * @param float $customerLat
     * @param float $customerLng
     * @return array ['distance' => float, 'cost' => float, 'outlet' => Outlet]
     */
    public function calculateShipping(int $outletId, float $customerLat, float $customerLng): array
    {
        $outlet = \App\Models\Outlet::findOrFail($outletId);

        if (!$outlet->latitude || !$outlet->longitude) {
            throw new \Exception('Outlet location not configured');
        }

        $distance = $this->calculateDistance(
            $outlet->latitude,
            $outlet->longitude,
            $customerLat,
            $customerLng
        );

        $cost = $this->calculateCost($distance, $outlet->price_per_km);

        return [
            'distance' => $distance,
            'cost' => $cost,
            'outlet' => $outlet,
            'price_per_km' => $outlet->price_per_km
        ];
    }
}