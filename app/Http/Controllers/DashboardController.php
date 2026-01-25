<?php

namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display dashboard with scoped data
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // DATA SCOPING LOGIC
        // Jika user punya outlet -> filter by outlet
        // Jika user global (id_outlet null) -> show all data
        
        $transaksiQuery = Transaksi::query();
        
        if ($user->id_outlet !== null) {
            // User terikat ke outlet tertentu -> filter
            $transaksiQuery->where('id_outlet', $user->id_outlet);
        }
        
        // Calculate metrics
        $totalPendapatan = (clone $transaksiQuery)
            ->where('dibayar', Transaksi::DIBAYAR_LUNAS)
            ->get()
            ->sum(function ($transaksi) {
                return $transaksi->total_akhir;
            });
        
        $jumlahTransaksi = $transaksiQuery->count();
        
        // Member count (no scope - members are global)
        $jumlahMember = Customer::where('is_member', true)->count();
        
        // Recent transactions (limited to 10)
        $recentTransaksi = (clone $transaksiQuery)
            ->with(['customer', 'outlet', 'user'])
            ->latest('tgl')
            ->take(10)
            ->get()
            ->map(function ($transaksi) {
                return [
                    'id' => $transaksi->id,
                    'kode_invoice' => $transaksi->kode_invoice,
                    'customer_name' => $transaksi->customer->nama,
                    'outlet_name' => $transaksi->outlet->nama,
                    'total' => $transaksi->total_akhir,
                    'status' => $transaksi->status,
                    'dibayar' => $transaksi->dibayar,
                    'tgl' => $transaksi->tgl->format('d M Y H:i'),
                ];
            });
        
        return Inertia::render('Dashboard', [
            'stats' => [
                'total_pendapatan' => $totalPendapatan,
                'jumlah_transaksi' => $jumlahTransaksi,
                'jumlah_member' => $jumlahMember,
            ],
            'recent_transaksi' => $recentTransaksi,
            'scoped_to_outlet' => $user->id_outlet !== null,
            'outlet_name' => $user->outlet?->nama,
        ]);
    }
}