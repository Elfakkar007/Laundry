<?php

namespace App\Http\Controllers;

use App\Models\Outlet;
use App\Models\Transaksi;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LaporanController extends Controller
{
    /**
     * Display the reports page.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // 1. Filter Parameters
        // Default: Current Month
        $startDate = $request->input('date_from') ?: Carbon::now()->startOfMonth()->format('Y-m-d');
        $endDate = $request->input('date_to') ?: Carbon::now()->endOfMonth()->format('Y-m-d');
        
        // Determine effective outlet filter
        $isGlobal = $user->hasRole(['admin', 'owner']);
        $userOutletId = $user->id_outlet;
        $selectedOutletId = (!$isGlobal && $userOutletId) ? $userOutletId : $request->input('outlet_id');

        // 3. Base Query Builder
        $query = Transaksi::query()
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);

        // Apply outlet filter if selected or forced
        if ($selectedOutletId) {
            $query->where('id_outlet', $selectedOutletId);
        }

        // 4. Aggregations (Summary Cards)
        // Clone query for independent aggregations
        $totalOmzet = (clone $query)->sum('total_akhir');
        $totalTransaksi = (clone $query)->count();
        $totalLunas = (clone $query)->where('dibayar', Transaksi::DIBAYAR_LUNAS)->count();
        $totalBelumLunas = (clone $query)->where('dibayar', Transaksi::DIBAYAR_BELUM)->count();
        
        // Average Order Value (AOV)
        $avgOmzet = $totalTransaksi > 0 ? $totalOmzet / $totalTransaksi : 0;

        // 5. Chart Data (Daily Revenue)
        $chartData = (clone $query)
            ->selectRaw('DATE(created_at) as date, SUM(total_akhir) as revenue, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('d M'),
                    'revenue' => (float) $item->revenue,
                    'count' => (int) $item->count,
                    'timestamp' => Carbon::parse($item->date)->timestamp,
                ];
            });

        // 6. Recent Transactions Table
        $recentTransactions = (clone $query)
            ->with(['customer', 'outlet', 'user'])
            ->latest()
            ->limit(50) 
            ->get();

        // 7. Available Outlets (For Admin Dropdown)
        $outlets = $isGlobal ? Outlet::select('id', 'nama')->get() : [];

        return Inertia::render('Laporan/Index', [
            'filters' => [
                'date_from' => $startDate,
                'date_to' => $endDate,
                'outlet_id' => $selectedOutletId,
            ],
            'summary' => [
                'total_omzet' => $totalOmzet,
                'total_transaksi' => $totalTransaksi,
                'avg_omzet' => $avgOmzet,
                'total_lunas' => $totalLunas,
                'total_belum_lunas' => $totalBelumLunas,
            ],
            'chart_data' => $chartData,
            'recent_transactions' => $recentTransactions,
            'outlets' => $outlets,
            'user_role' => $userOutletId ? 'kasir' : 'admin', // Flag for frontend UI state
        ]);
    }
}
