<?php

namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\Customer;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display dashboard with role-specific data
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isGlobal = $user->hasRole(['admin', 'owner']);
        
        if ($isGlobal) {
            return $this->globalDashboard($user);
        } else {
            return $this->outletDashboard($user);
        }
    }

    /**
     * Global Dashboard for Admin/Owner
     */
    private function globalDashboard($user): Response
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $thisMonthStart = Carbon::now()->startOfMonth();
        $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();
        $last7Days = Carbon::now()->subDays(6)->startOfDay();

        // Overall Stats
        $totalOmzet = Transaksi::where('dibayar', Transaksi::DIBAYAR_LUNAS)->sum('total_akhir');
        $totalTransaksi = Transaksi::count();
        $todayTransaksi = Transaksi::whereDate('tgl', $today)->count();
        $pendingPayments = Transaksi::where('dibayar', Transaksi::DIBAYAR_BELUM)->count();
        $totalMembers = Customer::where('is_member', true)->count();

        // Today vs Yesterday
        $todayOmzet = Transaksi::whereDate('tgl', $today)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');
        $yesterdayOmzet = Transaksi::whereDate('tgl', $yesterday)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');

        // This Month vs Last Month
        $thisMonthOmzet = Transaksi::whereDate('tgl', '>=', $thisMonthStart)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');
        $lastMonthOmzet = Transaksi::whereBetween('tgl', [$lastMonthStart, $lastMonthEnd])
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');

        // Per-Outlet Performance
        $outletPerformance = Outlet::select('outlets.id', 'outlets.nama')
            ->leftJoin('transaksis', 'outlets.id', '=', 'transaksis.id_outlet')
            ->selectRaw('COUNT(transaksis.id) as total_transaksi')
            ->selectRaw('SUM(CASE WHEN DATE(transaksis.tgl) = ? THEN 1 ELSE 0 END) as today_transaksi', [$today->format('Y-m-d')])
            ->selectRaw('SUM(CASE WHEN transaksis.dibayar = ? THEN transaksis.total_akhir ELSE 0 END) as total_revenue', [Transaksi::DIBAYAR_LUNAS])
            ->selectRaw('SUM(CASE WHEN DATE(transaksis.tgl) = ? AND transaksis.dibayar = ? THEN transaksis.total_akhir ELSE 0 END) as today_revenue', [$today->format('Y-m-d'), Transaksi::DIBAYAR_LUNAS])
            ->selectRaw('SUM(CASE WHEN transaksis.dibayar = ? THEN 1 ELSE 0 END) as pending_count', [Transaksi::DIBAYAR_BELUM])
            ->groupBy('outlets.id', 'outlets.nama')
            ->orderByDesc('total_revenue')
            ->get();

        // Top Outlet
        $topOutlet = $outletPerformance->first();

        // Status Breakdown
        $statusBreakdown = Transaksi::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Last 7 Days Revenue Trend
        $revenueTrend = Transaksi::selectRaw('DATE(tgl) as date, SUM(total_akhir) as revenue, COUNT(*) as count')
            ->where('tgl', '>=', $last7Days)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('d M'),
                    'revenue' => (float) $item->revenue,
                    'count' => (int) $item->count,
                ];
            });

        // Recent Transactions (All Outlets)
        $recentTransactions = Transaksi::with(['customer', 'outlet', 'user'])
            ->latest('tgl')
            ->take(10)
            ->get();

        return Inertia::render('Dashboard', [
            'dashboard_type' => 'global',
            'stats' => [
                'total_omzet' => $totalOmzet,
                'total_transaksi' => $totalTransaksi,
                'today_transaksi' => $todayTransaksi,
                'pending_payments' => $pendingPayments,
                'total_members' => $totalMembers,
                'today_omzet' => $todayOmzet,
                'yesterday_omzet' => $yesterdayOmzet,
                'this_month_omzet' => $thisMonthOmzet,
                'last_month_omzet' => $lastMonthOmzet,
            ],
            'outlet_performance' => $outletPerformance,
            'top_outlet' => $topOutlet,
            'status_breakdown' => $statusBreakdown,
            'revenue_trend' => $revenueTrend,
            'recent_transactions' => $recentTransactions,
        ]);
    }

    /**
     * Outlet Dashboard for Kasir
     */
    private function outletDashboard($user): Response
    {
        $outletId = $user->id_outlet;
        $today = Carbon::today();
        $thisWeekStart = Carbon::now()->startOfWeek();

        // Today's Stats
        $todayTransaksi = Transaksi::where('id_outlet', $outletId)
            ->whereDate('tgl', $today)
            ->count();

        $todayOmzet = Transaksi::where('id_outlet', $outletId)
            ->whereDate('tgl', $today)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');

        $todayPending = Transaksi::where('id_outlet', $outletId)
            ->whereDate('tgl', $today)
            ->where('dibayar', Transaksi::DIBAYAR_BELUM)
            ->count();

        $readyToPickup = Transaksi::where('id_outlet', $outletId)
            ->whereIn('status', ['selesai', 'dikirim'])
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->count();

        // Status Breakdown
        $statusBreakdown = Transaksi::where('id_outlet', $outletId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // This Week Trend
        $weekTrend = Transaksi::where('id_outlet', $outletId)
            ->selectRaw('DATE(tgl) as date, SUM(total_akhir) as revenue, COUNT(*) as count')
            ->where('tgl', '>=', $thisWeekStart)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('D'),
                    'revenue' => (float) $item->revenue,
                    'count' => (int) $item->count,
                ];
            });

        // Transactions Needing Attention
        $needsAttention = [
            'belum_lunas' => Transaksi::where('id_outlet', $outletId)
                ->where('dibayar', Transaksi::DIBAYAR_BELUM)
                ->with(['customer'])
                ->latest('tgl')
                ->take(5)
                ->get(),
            'siap_diambil' => Transaksi::where('id_outlet', $outletId)
                ->whereIn('status', ['selesai', 'dikirim'])
                ->with(['customer'])
                ->latest('tgl')
                ->take(5)
                ->get(),
        ];

        // Recent Transactions (Today)
        $recentTransactions = Transaksi::where('id_outlet', $outletId)
            ->with(['customer', 'user'])
            ->whereDate('tgl', $today)
            ->latest('tgl')
            ->take(10)
            ->get();

        // Overall Stats (for context)
        $totalTransaksi = Transaksi::where('id_outlet', $outletId)->count();
        $totalOmzet = Transaksi::where('id_outlet', $outletId)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->sum('total_akhir');

        return Inertia::render('Dashboard', [
            'dashboard_type' => 'outlet',
            'outlet_name' => $user->outlet?->nama,
            'today_stats' => [
                'transaksi' => $todayTransaksi,
                'omzet' => $todayOmzet,
                'pending' => $todayPending,
                'ready_to_pickup' => $readyToPickup,
            ],
            'status_breakdown' => $statusBreakdown,
            'week_trend' => $weekTrend,
            'needs_attention' => $needsAttention,
            'recent_transactions' => $recentTransactions,
            'overall_stats' => [
                'total_transaksi' => $totalTransaksi,
                'total_omzet' => $totalOmzet,
            ],
        ]);
    }
}