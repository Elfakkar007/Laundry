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

    // ------------------------------------------------------------------ index
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

    // ---------------------------------------------------------------- create
    /**
     * Show the form for creating a new transaction
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
        $customers = Customer::select('id', 'nama', 'no_hp', 'alamat', 'latitude', 'longitude', 'is_member', 'poin')
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

        // Separate surcharges and shipping
        $surcharges = Surcharge::where('is_active', true)
            ->surchargesOnly()
            ->orderBy('nama')
            ->get();

        $shippingOptions = Surcharge::where('is_active', true)
            ->shippingOnly()
            ->orderBy('nama')
            ->get();

        // NEW: Get all active & valid stackable promos
        $promos = Promo::active()
            ->valid()
            ->stackable()
            ->orderBy('priority', 'asc')
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

    // --------------------------------------------------------- getOutletData
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

    // ------------------------------------------------------------------ store
    /**
     * Store a newly created transaction.
     * NEW: Supports multiple automatic promo stacking
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission('transaksi.create');

        $user = $request->user();

        $validated = $request->validate([
            'id_outlet' => 'required|exists:outlets,id',
            'id_customer' => 'nullable|exists:customers,id',
            'tgl' => 'required|date',
            'batas_waktu' => 'nullable|date|after_or_equal:tgl',
            'items' => 'required|array|min:1',
            'items.*.id_paket' => 'required|exists:pakets,id',
            'items.*.qty' => 'required|numeric|min:0.1',
            'surcharges' => 'nullable|array',
            'surcharges.*' => 'exists:surcharges,id',
            'surcharge_distances' => 'nullable|array',
            'surcharge_distances.*' => 'numeric|min:0',
            'shipping_id' => 'nullable|exists:surcharges,id',
            'shipping_distance' => 'nullable|numeric|min:0',
            'redeem_points' => 'nullable|integer|min:0',
            'payment_action' => 'required|in:bayar_lunas,bayar_nanti',
            'jumlah_bayar' => 'nullable|numeric|min:0',
            'alamat_update' => 'nullable|string',
            'latitude_update' => 'nullable|numeric|between:-90,90',
            'longitude_update' => 'nullable|numeric|between:-180,180',
        ], [
            'items.required' => 'Minimal harus ada 1 item',
            'items.min' => 'Minimal harus ada 1 item',
        ]);

        // Outlet scoping for kasir
        if ($user->id_outlet !== null && $validated['id_outlet'] != $user->id_outlet) {
            abort(403, 'Unauthorized outlet access');
        }

        $customer = $validated['id_customer'] ? Customer::find($validated['id_customer']) : null;

        try {
            DB::beginTransaction();

            // NEW: Calculate with automatic multiple promos
            $calculation = $this->calculateTransactionTotal(
                $validated['items'],
                $validated['surcharges'] ?? [],
                $validated['surcharge_distances'] ?? [],
                $validated['shipping_id'] ?? null,
                $validated['shipping_distance'] ?? 0,
                $validated['redeem_points'] ?? 0,
                $customer
            );

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
                'diskon_detail' => $calculation['diskon_detail'], // NEW: Save detailed discount info
                'pajak' => $calculation['pajak_amount'],
                'status' => Transaksi::STATUS_BARU,
                'dibayar' => $validated['payment_action'] === 'bayar_lunas' 
                    ? Transaksi::DIBAYAR_LUNAS 
                    : Transaksi::DIBAYAR_BELUM,
                'id_user' => $user->id,
            ]);

            // Create detail transactions
            foreach ($validated['items'] as $item) {
                $transaksi->detailTransaksis()->create([
                    'id_paket' => $item['id_paket'],
                    'qty' => $item['qty'],
                ]);
            }

            // Handle points redemption
            if ($customer && $calculation['actual_redeem_points'] > 0) {
                $customer->addPoints(-$calculation['actual_redeem_points'], 'redeem', [
                    'discount_amount' => $calculation['diskon_poin'],
                    'reference_type' => 'App\Models\Transaksi',
                    'reference_id' => $transaksi->id,
                    'notes' => "Penukaran poin untuk transaksi {$transaksi->kode_invoice}",
                    'created_by' => $user->id,
                ]);
            }

            // Award points if paid
            if ($validated['payment_action'] === 'bayar_lunas' && $customer && $customer->is_member) {
                $earnedPoints = $calculation['earned_points'];
                if ($earnedPoints > 0) {
                    $customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $calculation['gross_total_for_points'],
                        'reference_type' => 'App\Models\Transaksi',
                        'reference_id' => $transaksi->id,
                        'notes' => "Pembayaran transaksi {$transaksi->kode_invoice}",
                        'created_by' => $user->id,
                    ]);
                }
            }

            // Update customer address and coordinates if provided
            if ($customer && !empty($validated['alamat_update'])) {
                $update = ['alamat' => $validated['alamat_update']];
                if (isset($validated['latitude_update']) && isset($validated['longitude_update'])) {
                    $update['latitude'] = $validated['latitude_update'];
                    $update['longitude'] = $validated['longitude_update'];
                }
                $customer->update($update);
            }

            // Auto-member check
            if ($customer && !$customer->is_member) {
                $completedCount = Transaksi::where('id_customer', $customer->id)
                    ->where('status', '!=', 'batal')
                    ->count();

                if ($completedCount >= 5) {
                    $customer->update(['is_member' => true]);
                }
            }

            DB::commit();

            return redirect()->route('transaksi.index')->with('success', 'Transaksi berhasil dibuat!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transaction creation failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal membuat transaksi: ' . $e->getMessage());
        }
    }

    // ---------------------------------------------------------------- destroy
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

    // -------------------------------------------------------- generateInvoice
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

    // --------------------------------------------------------- calculateTotal
    /**
     * Calculate transaction total with AUTOMATIC MULTIPLE PROMOS
     * NEW: Automatically applies all eligible stackable promos
     */
    private function calculateTransactionTotal(
        array $items,
        array $surchargeIds,
        array $surchargeDistances,
        ?int $shippingId,
        float $shippingDistance,
        int $redeemPoints,
        ?Customer $customer
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

        // Calculate shipping separately
        $shippingCost = 0;
        if ($shippingId) {
            $shipping = Surcharge::find($shippingId);
            if ($shipping && $shipping->isShipping()) {
                $shippingCost = $shipping->calculateAmount($subtotalItems, $shippingDistance);
            }
        }

        // Base for discount = Items + Surcharges ONLY (exclude shipping)
        $baseForDiscount = $subtotalItems + $totalSurcharge;
        $grossTotalForPoints = $baseForDiscount;

        // NEW: Automatic multiple promo application
        $promoResult = Promo::calculateStackedDiscounts($customer, $baseForDiscount);
        $diskonPromo = $promoResult['total_discount'];
        $appliedPromos = $promoResult['discounts'];

        // Points redemption with clamping
        $pointsRedeemValue = (float) Setting::getValue('points_redeem_value', 500);
        $customerAvailablePoints = $customer ? $customer->poin : 0;

        $remainingBillAfterPromo = max(0, $baseForDiscount - $diskonPromo);
        $maxRedeemablePointsByBill = floor($remainingBillAfterPromo / $pointsRedeemValue);
        $maxRedeemablePoints = min($customerAvailablePoints, $maxRedeemablePointsByBill);
        $actualRedeemPoints = min($redeemPoints, $maxRedeemablePoints);
        $diskonPoin = $actualRedeemPoints * $pointsRedeemValue;

        // Prepare discount detail for database
        $diskonDetail = [];
        
        // Add promo discounts
        foreach ($appliedPromos as $promo) {
            $diskonDetail[] = [
                'id' => $promo['id'],
                'type' => 'promo',
                'nama' => $promo['nama'],
                'jenis' => $promo['jenis'],
                'nilai' => $promo['nilai'],
                'amount' => $promo['amount'],
                'is_member_only' => $promo['is_member_only'],
            ];
        }

        // Add points discount
        if ($actualRedeemPoints > 0) {
            $diskonDetail[] = [
                'id' => 'points',
                'type' => 'points',
                'nama' => 'Penukaran Poin',
                'points' => $actualRedeemPoints,
                'amount' => $diskonPoin,
            ];
        }

        $totalDiskon = $diskonPromo + $diskonPoin;
        $totalSetelahDiskon = max(0, $baseForDiscount - $totalDiskon);

        // Add shipping AFTER discount applied
        $totalDenganShipping = $totalSetelahDiskon + $shippingCost;

        // Calculate tax
        $taxRate = (float) Setting::getValue('tax_rate', 11);
        $autoApplyTax = Setting::getValue('auto_apply_tax', true);
        $pajakAmount = $autoApplyTax ? ($totalDenganShipping * $taxRate / 100) : 0;

        // Total akhir
        $totalAkhir = $totalDenganShipping + $pajakAmount;

        // Points earned from gross total
        $earnedPoints = 0;
        if ($customer && $customer->is_member && Setting::getValue('points_enabled', true)) {
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
            'diskon_detail' => $diskonDetail, // NEW
            'applied_promos' => $appliedPromos, // NEW
            'total_setelah_diskon' => $totalSetelahDiskon,
            'total_dengan_shipping' => $totalDenganShipping,
            'pajak_rate' => $taxRate,
            'pajak_amount' => $pajakAmount,
            'total_akhir' => $totalAkhir,
            'earned_points' => $earnedPoints,
            'max_redeemable_points' => $maxRedeemablePoints,
            'actual_redeem_points' => $actualRedeemPoints,
        ];
    }
}