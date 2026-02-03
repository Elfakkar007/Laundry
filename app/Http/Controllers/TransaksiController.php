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
use Illuminate\Support\Facades\Log;
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
     * UPDATED: Separate shipping from surcharges
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission('transaksi.create');

        $user = $request->user();
        
        // Determine selected outlet
        if ($user->id_outlet !== null) {
            $selectedOutletId = $user->id_outlet;
        } else {
            $selectedOutletId = $request->input('outlet_id');
            
            if (!$selectedOutletId) {
                $firstOutlet = Outlet::orderBy('nama')->first();
                $selectedOutletId = $firstOutlet ? $firstOutlet->id : null;
            }
        }

        // Get outlets for admin
        $outlets = $user->id_outlet === null 
            ? Outlet::select('id', 'nama')->orderBy('nama')->get()
            : null;

        // Get customers
        $customers = Customer::select('id', 'nama', 'no_hp', 'is_member', 'poin')
            ->orderBy('nama')
            ->get();

        // Get active pakets for selected outlet
        $pakets = $selectedOutletId
            ? Paket::where('id_outlet', $selectedOutletId)
                ->where('is_active', true)
                ->with('packageType')
                ->orderBy('nama_paket')
                ->get()
            : collect();

        // REVISI 1: Separate surcharges and shipping
        $surcharges = Surcharge::where('is_active', true)
            ->surchargesOnly()
            ->orderBy('nama')
            ->get();

        $shippingOptions = Surcharge::where('is_active', true)
            ->shippingOnly()
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
        $invoiceCode = $selectedOutletId ? $this->generateInvoiceCode($selectedOutletId) : null;

        return Inertia::render('Transaksi/Create', [
            'outlets' => $outlets,
            'customers' => $customers,
            'pakets' => $pakets,
            'surcharges' => $surcharges,
            'shippingOptions' => $shippingOptions,
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

        if ($request->user()->id_outlet !== null) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $pakets = Paket::where('id_outlet', $outletId)
            ->where('is_active', true)
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
     * UPDATED: New calculation logic with 6 revisions
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        Log::info('Transaksi Store Request', ['data' => $request->all()]);

        // REVISI 5: Enhanced validation
        $validated = $request->validate([
            'id_outlet' => 'required|exists:outlets,id',
            'id_customer' => 'required|exists:customers,id',
            'tgl' => 'required|date',
            'batas_waktu' => 'required|date|after:tgl',
            'items' => 'required|array|min:1',
            'items.*.id_paket' => 'required|exists:pakets,id',
            'items.*.qty' => 'required|numeric|min:0.01', // Tidak boleh 0
            'items.*.keterangan' => 'nullable|string|max:500',
            'surcharges' => 'nullable|array',
            'surcharges.*' => 'exists:surcharges,id',
            'surcharge_distances' => 'nullable|array',
            'shipping_id' => 'nullable|exists:surcharges,id',
            'shipping_distance' => 'nullable|numeric|min:0',
            'id_promo' => 'nullable|exists:promos,id',
            'redeem_points' => 'nullable|integer|min:0',
            // status tidak perlu validasi - akan hardcoded ke 'baru'
            'payment_action' => 'required|in:bayar_nanti,bayar_lunas',
            'jumlah_bayar' => 'required_if:payment_action,bayar_lunas|nullable|numeric|min:0',
        ], [
            'id_outlet.required' => 'Outlet wajib dipilih',
            'id_customer.required' => 'Customer wajib dipilih',
            'items.required' => 'Minimal 1 item paket wajib ditambahkan',
            'items.*.qty.min' => 'Quantity tidak boleh 0 atau kurang',
            'items.*.id_paket.required' => 'Paket wajib dipilih',
        ]);

        // Validation: Kasir cannot create for other outlets
        if ($request->user()->id_outlet !== null && $validated['id_outlet'] != $request->user()->id_outlet) {
            return redirect()->back()->withErrors(['id_outlet' => 'Tidak dapat membuat transaksi untuk outlet lain!'])->withInput();
        }

        // REVISI 5: Validate no zero price packages
        foreach ($validated['items'] as $item) {
            $paket = Paket::find($item['id_paket']);
            if (!$paket || $paket->harga <= 0) {
                return redirect()->back()->withErrors([
                    'items' => 'Paket dengan harga Rp0 tidak dapat digunakan dalam transaksi!'
                ])->withInput();
            }
        }

        try {
            DB::beginTransaction();

            $customer = Customer::findOrFail($validated['id_customer']);

            // Calculate totals with NEW LOGIC
            $calculation = $this->calculateTransactionTotal(
                $validated['items'],
                $validated['surcharges'] ?? [],
                $validated['surcharge_distances'] ?? [],
                $validated['shipping_id'] ?? null,
                $validated['shipping_distance'] ?? 0,
                $validated['id_promo'] ?? null,
                $validated['redeem_points'] ?? 0,
                $customer
            );

            Log::info('Transaction Calculation', $calculation);

            // REVISI 6: Validate redeem points with clamping
            if (($validated['redeem_points'] ?? 0) > 0) {
                $maxRedeemablePoints = $calculation['max_redeemable_points'];
                if ($validated['redeem_points'] > $maxRedeemablePoints) {
                    DB::rollBack();
                    $maxValue = formatRupiah($maxRedeemablePoints * Setting::getValue('points_redeem_value', 500));
                    return redirect()->back()->withErrors([
                        'redeem_points' => "Poin yang dapat ditukar maksimal {$maxRedeemablePoints} poin (senilai {$maxValue}). Sisanya akan terbuang!"
                    ])->withInput();
                }

                if ($customer->poin < $validated['redeem_points']) {
                    DB::rollBack();
                    return redirect()->back()->withErrors(['redeem_points' => 'Poin pelanggan tidak mencukupi!'])->withInput();
                }
            }

            // Validate payment amount if bayar_lunas
            if ($validated['payment_action'] === 'bayar_lunas') {
                if ($validated['jumlah_bayar'] < $calculation['total_akhir']) {
                    DB::rollBack();
                    return redirect()->back()->withErrors(['jumlah_bayar' => 'Jumlah bayar kurang dari total tagihan!'])->withInput();
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
                'biaya_tambahan' => $calculation['total_surcharge'] + $calculation['shipping_cost'],
                'diskon' => $calculation['total_diskon'],
                'pajak' => $calculation['pajak_rate'],
                'status' => 'baru', // Hardcoded untuk transaksi baru
                'dibayar' => $validated['payment_action'] === 'bayar_lunas' ? Transaksi::DIBAYAR_LUNAS : Transaksi::DIBAYAR_BELUM,
                'id_user' => $request->user()->id,
            ]);

            Log::info('Transaksi Created', ['id' => $transaksi->id, 'invoice' => $transaksi->kode_invoice]);

            // Create detail items
            foreach ($validated['items'] as $item) {
                $detail = $transaksi->detailTransaksis()->create([
                    'id_paket' => $item['id_paket'],
                    'qty' => $item['qty'],
                    'keterangan' => $item['keterangan'] ?? null,
                ]);
                Log::info('Detail Created', ['detail_id' => $detail->id]);
            }

            // Handle points redemption
            if (($validated['redeem_points'] ?? 0) > 0) {
                $customer->deductPoints($validated['redeem_points'], 'redeem', [
                    'notes' => "Ditukar untuk transaksi {$transaksi->kode_invoice}",
                    'reference_type' => 'App\Models\Transaksi',
                    'reference_id' => $transaksi->id,
                    'created_by' => $request->user()->id,
                ]);
                Log::info('Points Redeemed', ['points' => $validated['redeem_points']]);
            }

            // REVISI 3: Handle points earning dari GROSS TOTAL (sebelum diskon)
            if ($validated['payment_action'] === 'bayar_lunas' && $customer->is_member) {
                $earnedPoints = Customer::calculatePointsFromAmount($calculation['gross_total_for_points']);
                if ($earnedPoints > 0) {
                    $customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $calculation['gross_total_for_points'],
                        'reference_type' => 'App\Models\Transaksi',
                        'reference_id' => $transaksi->id,
                        'notes' => "Belanja transaksi {$transaksi->kode_invoice}",
                        'created_by' => $request->user()->id,
                    ]);
                    Log::info('Points Earned', ['points' => $earnedPoints, 'from_gross' => $calculation['gross_total_for_points']]);
                }
            }

            DB::commit();

            Log::info('Transaction Saved Successfully', ['transaksi_id' => $transaksi->id]);

            return redirect()->route('transaksi.index')->with('success', 
                $validated['payment_action'] === 'bayar_lunas' 
                    ? "Transaksi berhasil dibuat dan pembayaran telah diterima! Invoice: {$transaksi->kode_invoice}"
                    : "Transaksi berhasil dibuat! Invoice: {$transaksi->kode_invoice}"
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transaction Store Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->withErrors(['error' => 'Gagal membuat transaksi: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Display the specified transaction
     */
    public function show(Transaksi $transaksi): Response
    {
        $this->authorizePermission('transaksi.detail');

        // Authorization
        if (auth()->user()->id_outlet !== null && $transaksi->id_outlet !== auth()->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        $transaksi->load([
            'customer',
            'outlet',
            'user',
            'detailTransaksis.paket.packageType'
        ]);

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
     * UPDATED: Points calculation from gross
     */
    public function processPayment(Request $request, Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        if ($request->user()->id_outlet !== null && $transaksi->id_outlet !== $request->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

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

            // REVISI 3: Award points from GROSS TOTAL (before discount)
            if ($transaksi->customer->is_member) {
                $grossTotal = $transaksi->total_sebelum_diskon; // Sudah termasuk surcharge + shipping
                $earnedPoints = Customer::calculatePointsFromAmount($grossTotal);
                if ($earnedPoints > 0) {
                    $transaksi->customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $grossTotal,
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
     * Remove the specified transaction
     */
    public function destroy(Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        if (auth()->user()->id_outlet !== null && $transaksi->id_outlet !== auth()->user()->id_outlet) {
            abort(403, 'Unauthorized action.');
        }

        if ($transaksi->status !== 'baru' || $transaksi->dibayar === Transaksi::DIBAYAR_LUNAS) {
            return redirect()->back()->with('error', 'Hanya transaksi baru yang belum dibayar yang dapat dihapus!');
        }

        try {
            DB::beginTransaction();

            // Restore redeemed points
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
     * Calculate transaction total with NEW LOGIC (6 Revisions Applied)
     * 
     * REVISI 1: Ongkir separated from surcharges
     * REVISI 2: Discount scope does NOT include shipping
     * REVISI 3: Points earned from GROSS TOTAL (before discount, excluding shipping)
     * REVISI 6: Anti-boncos points redemption with clamping
     */
    private function calculateTransactionTotal(
        array $items,
        array $surchargeIds,
        array $surchargeDistances,
        ?int $shippingId,
        float $shippingDistance,
        ?int $promoId,
        int $redeemPoints,
        Customer $customer
    ): array {
        // Step 1: Calculate subtotal items
        $subtotalItems = 0;
        foreach ($items as $item) {
            $paket = Paket::find($item['id_paket']);
            if (!$paket) continue;
            $subtotalItems += floatval($item['qty']) * floatval($paket->harga);
        }

        // Step 2: Calculate surcharges (NOT including shipping)
        $totalSurcharge = 0;
        foreach ($surchargeIds as $surchargeId) {
            $surcharge = Surcharge::find($surchargeId);
            if (!$surcharge || $surcharge->isShipping()) continue;

            $distance = $surchargeDistances[$surchargeId] ?? 0;
            $totalSurcharge += $surcharge->calculateAmount($subtotalItems, $distance);
        }

        // REVISI 1: Calculate shipping separately
        $shippingCost = 0;
        if ($shippingId) {
            $shipping = Surcharge::find($shippingId);
            if ($shipping && $shipping->isShipping()) {
                $shippingCost = $shipping->calculateAmount($subtotalItems, $shippingDistance);
            }
        }

        // REVISI 2: Base for discount = Items + Surcharges ONLY (exclude shipping)
        $baseForDiscount = $subtotalItems + $totalSurcharge;

        // REVISI 3: Gross total for points = Items + Surcharges ONLY (exclude shipping)
        $grossTotalForPoints = $baseForDiscount;

        // Step 3: Calculate discounts (applied to baseForDiscount ONLY)
        $diskonPromo = 0;
        if ($promoId) {
            $promo = Promo::find($promoId);
            if ($promo && $promo->canBeUsedBy($customer)) {
                $diskonPromo = $promo->calculateDiscount($baseForDiscount);
            }
        }

        // REVISI 6: Anti-boncos points redemption with clamping
        $pointsRedeemValue = (float) Setting::getValue('points_redeem_value', 500);
        $customerAvailablePoints = $customer->poin;
        
        // Maximum points that can be redeemed = min(customer's points, remaining bill value)
        $remainingBillAfterPromo = max(0, $baseForDiscount - $diskonPromo);
        $maxRedeemablePointsByBill = floor($remainingBillAfterPromo / $pointsRedeemValue);
        $maxRedeemablePoints = min($customerAvailablePoints, $maxRedeemablePointsByBill);

        // Clamp actual redeemPoints to maxRedeemablePoints
        $actualRedeemPoints = min($redeemPoints, $maxRedeemablePoints);
        $diskonPoin = $actualRedeemPoints * $pointsRedeemValue;

        $totalDiskon = $diskonPromo + $diskonPoin;
        $totalSetelahDiskon = max(0, $baseForDiscount - $totalDiskon);

        // Step 4: Add shipping AFTER discount applied
        $totalDenganShipping = $totalSetelahDiskon + $shippingCost;

        // Step 5: Calculate tax on (discounted subtotal + shipping)
        $taxRate = (float) Setting::getValue('tax_rate', 11);
        $autoApplyTax = Setting::getValue('auto_apply_tax', true);
        
        $pajakAmount = $autoApplyTax ? ($totalDenganShipping * $taxRate / 100) : 0;

        // Step 6: Total akhir
        $totalAkhir = $totalDenganShipping + $pajakAmount;

        // REVISI 3: Points earned from gross total (before discount, excluding shipping)
        $earnedPoints = 0;
        if ($customer->is_member && Setting::getValue('points_enabled', true)) {
            $earnedPoints = Customer::calculatePointsFromAmount($grossTotalForPoints);
        }

        return [
            'subtotal_items' => $subtotalItems,
            'total_surcharge' => $totalSurcharge,
            'shipping_cost' => $shippingCost,
            'base_for_discount' => $baseForDiscount,
            'gross_total_for_points' => $grossTotalForPoints,
            'diskon_promo' => $diskonPromo,
            'diskon_poin' => $diskonPoin,
            'total_diskon' => $totalDiskon,
            'total_setelah_diskon' => $totalSetelahDiskon,
            'total_dengan_shipping' => $totalDenganShipping,
            'pajak_rate' => $taxRate,
            'pajak_amount' => $pajakAmount,
            'total_akhir' => $totalAkhir,
            'earned_points' => $earnedPoints,
            'max_redeemable_points' => $maxRedeemablePoints,
        ];
    }
}