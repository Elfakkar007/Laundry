<?php

namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\Customer;
use App\Models\Paket;
use App\Models\Outlet;
use App\Models\Promo;
use App\Models\Surcharge;
use App\Models\Setting;
use App\Traits\HasAuthorization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class TransaksiController extends Controller
{
    use HasAuthorization;

    /**
     * Display a listing of transactions with outlet scoping
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission('transaksi.view');

        $user = $request->user();
        $search = $request->input('search');
        $statusFilter = $request->input('status_filter');
        $paymentFilter = $request->input('payment_filter');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $transaksiQuery = Transaksi::query()
            ->with(['customer', 'outlet', 'user']);

        // DATA SCOPING: Kasir hanya lihat transaksi outlet mereka
        if ($user->id_outlet !== null) {
            $transaksiQuery->where('id_outlet', $user->id_outlet);
        }

        // Filters
        if ($search) {
            $transaksiQuery->where(function ($q) use ($search) {
                $q->where('kode_invoice', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($q) use ($search) {
                      $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('no_hp', 'like', "%{$search}%");
                  });
            });
        }

        if ($statusFilter && $statusFilter !== 'all') {
            $transaksiQuery->where('status', $statusFilter);
        }

        if ($paymentFilter && $paymentFilter !== 'all') {
            $transaksiQuery->where('dibayar', $paymentFilter);
        }

        if ($dateFrom) {
            $transaksiQuery->whereDate('tgl', '>=', $dateFrom);
        }

        if ($dateTo) {
            $transaksiQuery->whereDate('tgl', '<=', $dateTo);
        }

        $transaksis = $transaksiQuery
            ->orderBy('tgl', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Append calculated total_akhir to each transaction
        $transaksis->getCollection()->transform(function ($transaksi) {
            $transaksi->total_akhir = $transaksi->total_akhir;
            return $transaksi;
        });

        return Inertia::render('Transaksi/Index', [
            'transaksis' => $transaksis,
            'filters' => $request->only(['search', 'status_filter', 'payment_filter', 'date_from', 'date_to']),
            'scoped_to_outlet' => $user->id_outlet !== null,
            'outlet_name' => $user->outlet?->nama,
        ]);
    }

    /**
     * Show the form for creating a new transaction
     * Returns data based on selected outlet (for admin) or user's outlet (for kasir)
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission('transaksi.create');

        $user = $request->user();
        $selectedOutletId = $request->input('outlet_id', $user->id_outlet);

        // For kasir, force their outlet
        if ($user->id_outlet !== null) {
            $selectedOutletId = $user->id_outlet;
        }

        // Get outlets for admin (for outlet switcher)
        $outlets = $user->id_outlet === null 
            ? Outlet::select('id', 'nama')->orderBy('nama')->get()
            : null;

        // Get customers (global, not scoped)
        $customers = Customer::select('id', 'nama', 'no_hp', 'is_member', 'poin')
            ->orderBy('nama')
            ->get();

        // Get pakets for selected outlet
        $pakets = $selectedOutletId
            ? Paket::where('id_outlet', $selectedOutletId)
                ->with('packageType')
                ->orderBy('nama_paket')
                ->get()
            : collect();

        // Get active surcharges
        $surcharges = Surcharge::where('is_active', true)
            ->orderBy('nama')
            ->get();

        // Get active & valid promos
        $promos = Promo::active()
            ->valid()
            ->orderBy('nama_promo')
            ->get();

        // Get settings
        $settings = [
            'tax_rate' => (float) Setting::getValue('tax_rate', 11),
            'auto_apply_tax' => Setting::getValue('auto_apply_tax', true),
            'points_enabled' => Setting::getValue('points_enabled', true),
            'points_earn_ratio' => (float) Setting::getValue('points_earn_ratio', 10000),
            'points_redeem_value' => (float) Setting::getValue('points_redeem_value', 500),
        ];

        // Generate invoice code
        $invoiceCode = $this->generateInvoiceCode($selectedOutletId);

        return Inertia::render('Transaksi/Create', [
            'outlets' => $outlets,
            'customers' => $customers,
            'pakets' => $pakets,
            'surcharges' => $surcharges,
            'promos' => $promos,
            'settings' => $settings,
            'invoiceCode' => $invoiceCode,
            'selectedOutletId' => $selectedOutletId,
            'isKasir' => $user->id_outlet !== null,
            'userOutlet' => $user->outlet,
            'userName' => $user->nama,
        ]);
    }

    /**
     * Get data for specific outlet (for admin outlet switcher)
     */
    public function getOutletData(Request $request, $outletId): \Illuminate\Http\JsonResponse
    {
        $this->authorizePermission('transaksi.create');

        // Only admin can switch outlets
        if ($request->user()->id_outlet !== null) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $pakets = Paket::where('id_outlet', $outletId)
            ->with('packageType')
            ->orderBy('nama_paket')
            ->get();

        $invoiceCode = $this->generateInvoiceCode($outletId);

        return response()->json([
            'pakets' => $pakets,
            'invoiceCode' => $invoiceCode,
        ]);
    }

    /**
     * Store a newly created transaction
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        $validated = $request->validate([
            'id_outlet' => 'required|exists:outlets,id',
            'id_customer' => 'required|exists:customers,id',
            'tgl' => 'required|date',
            'batas_waktu' => 'required|date|after:tgl',
            'items' => 'required|array|min:1',
            'items.*.id_paket' => 'required|exists:pakets,id',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.keterangan' => 'nullable|string|max:500',
            'surcharges' => 'nullable|array',
            'surcharges.*' => 'exists:surcharges,id',
            'surcharge_distances' => 'nullable|array',
            'id_promo' => 'nullable|exists:promos,id',
            'redeem_points' => 'nullable|integer|min:0',
            'status' => 'required|in:baru,proses,selesai,diambil',
            'payment_action' => 'required|in:bayar_nanti,bayar_lunas',
            'jumlah_bayar' => 'required_if:payment_action,bayar_lunas|nullable|numeric|min:0',
        ]);

        // Validation: Kasir cannot create for other outlets
        if ($request->user()->id_outlet !== null && $validated['id_outlet'] != $request->user()->id_outlet) {
            return redirect()->back()->with('error', 'Tidak dapat membuat transaksi untuk outlet lain!');
        }

        try {
            DB::beginTransaction();

            $customer = Customer::findOrFail($validated['id_customer']);

            // Calculate totals
            $calculation = $this->calculateTransactionTotal(
                $validated['items'],
                $validated['surcharges'] ?? [],
                $validated['surcharge_distances'] ?? [],
                $validated['id_promo'] ?? null,
                $validated['redeem_points'] ?? 0,
                $customer
            );

            // Validate redeem points
            if (($validated['redeem_points'] ?? 0) > 0 && $customer->poin < $validated['redeem_points']) {
                DB::rollBack();
                return redirect()->back()->with('error', 'Poin pelanggan tidak mencukupi!');
            }

            // Validate payment amount if bayar_lunas
            if ($validated['payment_action'] === 'bayar_lunas') {
                if ($validated['jumlah_bayar'] < $calculation['total_akhir']) {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'Jumlah bayar kurang dari total tagihan!');
                }
            }

            // Create transaction
            $transaksi = Transaksi::create([
                'id_outlet' => $validated['id_outlet'],
                'kode_invoice' => $this->generateInvoiceCode($validated['id_outlet']),
                'id_customer' => $validated['id_customer'],
                'tgl' => $validated['tgl'],
                'batas_waktu' => $validated['batas_waktu'],
                'tgl_bayar' => $validated['payment_action'] === 'bayar_lunas' ? now() : null,
                'biaya_tambahan' => $calculation['total_surcharge'],
                'diskon' => $calculation['total_diskon'],
                'pajak' => $calculation['pajak_rate'],
                'status' => $validated['status'],
                'dibayar' => $validated['payment_action'] === 'bayar_lunas' ? Transaksi::DIBAYAR_LUNAS : Transaksi::DIBAYAR_BELUM,
                'id_user' => $request->user()->id,
            ]);

            // Create detail items
            foreach ($validated['items'] as $item) {
                $transaksi->detailTransaksis()->create([
                    'id_paket' => $item['id_paket'],
                    'qty' => $item['qty'],
                    'keterangan' => $item['keterangan'] ?? null,
                ]);
            }

            // Handle points redemption
            if (($validated['redeem_points'] ?? 0) > 0) {
                $customer->deductPoints($validated['redeem_points'], 'redeem', [
                    'notes' => "Ditukar untuk transaksi {$transaksi->kode_invoice}",
                    'reference_type' => 'App\Models\Transaksi',
                    'reference_id' => $transaksi->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            // Handle points earning (only if paid)
            if ($validated['payment_action'] === 'bayar_lunas' && $customer->is_member) {
                $earnedPoints = Customer::calculatePointsFromAmount($calculation['total_akhir']);
                if ($earnedPoints > 0) {
                    $customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $calculation['total_akhir'],
                        'reference_type' => 'App\Models\Transaksi',
                        'reference_id' => $transaksi->id,
                        'notes' => "Belanja transaksi {$transaksi->kode_invoice}",
                        'created_by' => $request->user()->id,
                    ]);
                }
            }

            DB::commit();

            return redirect()->route('transaksi.index')->with('success', 
                $validated['payment_action'] === 'bayar_lunas' 
                    ? "Transaksi berhasil dibuat dan pembayaran telah diterima! Invoice: {$transaksi->kode_invoice}"
                    : "Transaksi berhasil dibuat! Invoice: {$transaksi->kode_invoice}"
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal membuat transaksi: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified transaction
     */
    public function show(Transaksi $transaksi): Response
    {
        $this->authorizePermission('transaksi.detail');

        // Authorization: User can only view transactions from their outlet
        if (auth()->user()->id_outlet !== null && $transaksi->id_outlet !== auth()->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        $transaksi->load([
            'customer',
            'outlet',
            'user',
            'detailTransaksis.paket.packageType'
        ]);

        // Append calculated total
        $transaksi->total_akhir = $transaksi->total_akhir;
        $transaksi->total_sebelum_diskon = $transaksi->total_sebelum_diskon;

        return Inertia::render('Transaksi/Show', [
            'transaksi' => $transaksi,
        ]);
    }

    /**
     * Update transaction status
     */
    public function updateStatus(Request $request, Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        // Authorization: User can only update transactions from their outlet
        if ($request->user()->id_outlet !== null && $transaksi->id_outlet !== $request->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'status' => 'required|in:baru,proses,selesai,diambil',
        ]);

        try {
            $transaksi->update([
                'status' => $validated['status'],
            ]);

            return redirect()->back()->with('success', 'Status transaksi berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate status: ' . $e->getMessage());
        }
    }

    /**
     * Process payment for unpaid transaction
     */
    public function processPayment(Request $request, Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        // Authorization
        if ($request->user()->id_outlet !== null && $transaksi->id_outlet !== $request->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        // Validate not already paid
        if ($transaksi->dibayar === Transaksi::DIBAYAR_LUNAS) {
            return redirect()->back()->with('error', 'Transaksi sudah dibayar!');
        }

        $validated = $request->validate([
            'jumlah_bayar' => 'required|numeric|min:0',
        ]);

        $totalAkhir = $transaksi->total_akhir;

        if ($validated['jumlah_bayar'] < $totalAkhir) {
            return redirect()->back()->with('error', 'Jumlah bayar kurang dari total tagihan!');
        }

        try {
            DB::beginTransaction();

            $transaksi->update([
                'dibayar' => Transaksi::DIBAYAR_LUNAS,
                'tgl_bayar' => now(),
            ]);

            // Award points if customer is member
            if ($transaksi->customer->is_member) {
                $earnedPoints = Customer::calculatePointsFromAmount($totalAkhir);
                if ($earnedPoints > 0) {
                    $transaksi->customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $totalAkhir,
                        'reference_type' => 'App\Models\Transaksi',
                        'reference_id' => $transaksi->id,
                        'notes' => "Pembayaran transaksi {$transaksi->kode_invoice}",
                        'created_by' => $request->user()->id,
                    ]);
                }
            }

            DB::commit();

            return redirect()->back()->with('success', 'Pembayaran berhasil diproses!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memproses pembayaran: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified transaction (only if baru & belum dibayar)
     */
    public function destroy(Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        // Authorization
        if (auth()->user()->id_outlet !== null && $transaksi->id_outlet !== auth()->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        // Business logic: Can only delete if baru & belum dibayar
        if ($transaksi->status !== 'baru' || $transaksi->dibayar === Transaksi::DIBAYAR_LUNAS) {
            return redirect()->back()->with('error', 'Hanya transaksi baru yang belum dibayar yang dapat dihapus!');
        }

        try {
            DB::beginTransaction();

            // Restore redeemed points if any
            $pointHistory = $transaksi->customer->pointHistories()
                ->where('reference_type', 'App\Models\Transaksi')
                ->where('reference_id', $transaksi->id)
                ->where('type', 'redeem')
                ->first();

            if ($pointHistory) {
                $transaksi->customer->increment('poin', abs($pointHistory->points));
            }

            $transaksi->delete();

            DB::commit();

            return redirect()->route('transaksi.index')->with('success', 'Transaksi berhasil dihapus!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menghapus transaksi: ' . $e->getMessage());
        }
    }

    /**
     * Generate unique invoice code
     */
    private function generateInvoiceCode($outletId): string
    {
        $today = now()->format('Ymd');
        $prefix = "INV-{$today}";

        // Get last invoice of today for this outlet
        $lastInvoice = Transaksi::where('id_outlet', $outletId)
            ->where('kode_invoice', 'like', "{$prefix}%")
            ->orderBy('kode_invoice', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) substr($lastInvoice->kode_invoice, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate transaction total with all discounts and charges
     */
    private function calculateTransactionTotal(
        array $items,
        array $surchargeIds,
        array $surchargeDistances,
        ?int $promoId,
        int $redeemPoints,
        Customer $customer
    ): array {
        // Step 1: Calculate subtotal items
        $subtotalItems = 0;
        foreach ($items as $item) {
            $paket = Paket::find($item['id_paket']);
            $subtotalItems += $item['qty'] * $paket->harga;
        }

        // Step 2: Calculate surcharges
        $totalSurcharge = 0;
        foreach ($surchargeIds as $surchargeId) {
            $surcharge = Surcharge::find($surchargeId);
            if (!$surcharge) continue;

            $distance = $surchargeDistances[$surchargeId] ?? 0;
            $totalSurcharge += $surcharge->calculateAmount($subtotalItems, $distance);
        }

        $totalDenganSurcharge = $subtotalItems + $totalSurcharge;

        // Step 3: Calculate discounts
        $diskonPromo = 0;
        if ($promoId) {
            $promo = Promo::find($promoId);
            if ($promo && $promo->canBeUsedBy($customer)) {
                $diskonPromo = $promo->calculateDiscount($totalDenganSurcharge);
            }
        }

        $diskonPoin = 0;
        if ($redeemPoints > 0) {
            $diskonPoin = Customer::calculatePointsValue($redeemPoints);
        }

        $totalDiskon = $diskonPromo + $diskonPoin;
        $totalSetelahDiskon = max(0, $totalDenganSurcharge - $totalDiskon);

        // Step 4: Calculate tax
        $taxRate = (float) Setting::getValue('tax_rate', 11);
        $autoApplyTax = Setting::getValue('auto_apply_tax', true);
        
        $pajakAmount = $autoApplyTax ? ($totalSetelahDiskon * $taxRate / 100) : 0;

        // Step 5: Total akhir
        $totalAkhir = $totalSetelahDiskon + $pajakAmount;

        return [
            'subtotal_items' => $subtotalItems,
            'total_surcharge' => $totalSurcharge,
            'total_dengan_surcharge' => $totalDenganSurcharge,
            'diskon_promo' => $diskonPromo,
            'diskon_poin' => $diskonPoin,
            'total_diskon' => $totalDiskon,
            'total_setelah_diskon' => $totalSetelahDiskon,
            'pajak_rate' => $taxRate,
            'pajak_amount' => $pajakAmount,
            'total_akhir' => $totalAkhir,
        ];
    }
}