<?php

namespace App\Http\Controllers;

use App\Models\Outlet;
use App\Models\Transaksi;
use App\Exports\TransaksiExport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class LaporanController extends Controller
{
    /**
     * Display the reports page with enhanced filtering and pagination.
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
            ->with(['customer', 'outlet', 'user'])
            ->whereDate('tgl', '>=', $startDate)
            ->whereDate('tgl', '<=', $endDate);

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
            ->selectRaw('DATE(tgl) as date, SUM(total_akhir) as revenue, COUNT(*) as count')
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

        // 6. Paginated Transactions Table (NEW)
        $transactions = (clone $query)
            ->latest('tgl')
            ->paginate(20)
            ->withQueryString();

        // 7. Available Outlets (For Admin/Owner Dropdown)
        $outlets = $isGlobal ? Outlet::select('id', 'nama')->get() : [];

        // Get outlet name for display
        $outletName = 'Semua Outlet';
        if ($selectedOutletId) {
            $outlet = Outlet::find($selectedOutletId);
            $outletName = $outlet ? $outlet->nama : 'Unknown';
        }

        return Inertia::render('Laporan/Index', [
            'filters' => [
                'date_from' => $startDate,
                'date_to' => $endDate,
                'outlet_id' => $selectedOutletId,
                'outlet_name' => $outletName,
            ],
            'summary' => [
                'total_omzet' => $totalOmzet,
                'total_transaksi' => $totalTransaksi,
                'avg_omzet' => $avgOmzet,
                'total_lunas' => $totalLunas,
                'total_belum_lunas' => $totalBelumLunas,
            ],
            'chart_data' => $chartData,
            'transactions' => $transactions,
            'outlets' => $outlets,
            'is_global' => $isGlobal,
        ]);
    }

    /**
     * Export transactions to Excel with professional formatting.
     */
    public function export(Request $request)
    {
        $user = $request->user();
        
        // Same filtering logic as index
        $startDate = $request->input('date_from') ?: Carbon::now()->startOfMonth()->format('Y-m-d');
        $endDate = $request->input('date_to') ?: Carbon::now()->endOfMonth()->format('Y-m-d');
        
        $isGlobal = $user->hasRole(['admin', 'owner']);
        $userOutletId = $user->id_outlet;
        $selectedOutletId = (!$isGlobal && $userOutletId) ? $userOutletId : $request->input('outlet_id');

        $query = Transaksi::query()
            ->with(['customer', 'outlet', 'user'])
            ->whereDate('tgl', '>=', $startDate)
            ->whereDate('tgl', '<=', $endDate);

        if ($selectedOutletId) {
            $query->where('id_outlet', $selectedOutletId);
        }

        // Get all transactions (no pagination for export)
        $transactions = $query->latest('tgl')->get();

        // Calculate summary
        $totalOmzet = $transactions->sum('total_akhir');
        $totalTransaksi = $transactions->count();
        $totalLunas = $transactions->where('dibayar', Transaksi::DIBAYAR_LUNAS)->count();
        $totalBelumLunas = $transactions->where('dibayar', Transaksi::DIBAYAR_BELUM)->count();

        // Get outlet name
        $outletName = 'Semua Outlet';
        if ($selectedOutletId) {
            $outlet = Outlet::find($selectedOutletId);
            $outletName = $outlet ? $outlet->nama : 'Unknown';
        }

        $filters = [
            'date_from' => Carbon::parse($startDate)->format('d/m/Y'),
            'date_to' => Carbon::parse($endDate)->format('d/m/Y'),
            'outlet_name' => $outletName,
        ];

        $summary = [
            'total_omzet' => $totalOmzet,
            'total_transaksi' => $totalTransaksi,
            'total_lunas' => $totalLunas,
            'total_belum_lunas' => $totalBelumLunas,
        ];

        $filename = 'Laporan_Transaksi_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';

        return Excel::download(
            new TransaksiExport($transactions, $filters, $summary),
            $filename
        );
    }
}
