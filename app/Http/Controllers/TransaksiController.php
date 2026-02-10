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
use Carbon\Carbon;
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
            
        $isGlobal = $user->hasRole(['admin', 'owner']);
        
        // DATA SCOPING: Kasir hanya lihat transaksi outlet mereka. Admin/Owner lihat semua.
        if (!$isGlobal && $user->id_outlet !== null) {
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
            ->orderBy('id', 'desc')
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
            'scoped_to_outlet' => !$isGlobal && $user->id_outlet !== null,
            'outlet_name' => $isGlobal ? 'Semua Outlet' : $user->outlet?->nama,
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

        // Determine user capabilities
        $isGlobal = $user->hasRole(['admin', 'owner']);

        // Determine selected outlet
        if (!$isGlobal && $user->id_outlet !== null) {
            $selectedOutletId = $user->id_outlet;
        } else {
            $selectedOutletId = $request->input('outlet_id');

            if (!$selectedOutletId) {
                // Default to user's assigned outlet if exists, otherwise first outlet
                $selectedOutletId = $user->id_outlet ?: (Outlet::orderBy('nama')->first()?->id);
            }
        }

        // Get outlets for switcher (only for non-restricted users)
        $outlets = $isGlobal
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
            'selectedOutletId' => (int) $selectedOutletId,
            'isKasir' => !$isGlobal && $user->id_outlet !== null,
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

        $user = $request->user();
        if (!$user->hasRole(['admin', 'owner'])) {
            return response()->json(['error' => 'Unauthorized. Only Admin/Owner can switch outlets.'], 403);
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

    // ------------------------------------------------------------------ show
    /**
     * Display transaction detail page
     */
    public function show(Transaksi $transaksi): Response
    {
        $this->authorizePermission('transaksi.view');
        
        $user = auth()->user();
        
        $isGlobal = $user->hasRole(['admin', 'owner']);
        
        if (!$isGlobal && $user->id_outlet !== null && $transaksi->id_outlet !== $user->id_outlet) {
            abort(403, 'Anda tidak memiliki akses ke transaksi ini.');
        }
        
        // Load all necessary relationships including paket for pricing
        $transaksi->load([
            'customer',
            'outlet',
            'user',
            'detailTransaksis.paket.packageType',
        ]);
        
        return Inertia::render('Transaksi/Show', [
            'transaksi' => $transaksi,
            // FIXED: Show ALL statuses to allow manual override/correction as requested
            'allowedNextStatuses' => Transaksi::getAvailableStatuses(),
            'isDelivery' => $transaksi->isDelivery(),
        ]);
    }

    // ------------------------------------------------------------------ updateStatus
    /**
     * Update transaction status with validation
     */
    public function updateStatus(Request $request, Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.edit');
        
        $user = auth()->user();
        
        $isGlobal = $user->hasRole(['admin', 'owner']);
        
        // Outlet scoping for kasir
        if (!$isGlobal && $user->id_outlet !== null && $transaksi->id_outlet !== $user->id_outlet) {
            abort(403, 'Anda tidak memiliki akses ke transaksi ini.');
        }
        
        $validated = $request->validate([
            'status' => 'required|in:' . implode(',', Transaksi::getAvailableStatuses()),
            'notes' => 'nullable|string|max:500',
        ]);
        
        // Check if status transition is allowed
        // RELAXED: Allow Any Status Change for manual correction
        // $allowedStatuses = $transaksi->getAllowedNextStatuses();
        // if (!in_array($validated['status'], $allowedStatuses)) {
        //     return back()->with('error', 'Transisi status tidak diizinkan. Status yang diizinkan: ' . implode(', ', $allowedStatuses));
        // }
        
        $oldStatus = $transaksi->status;
        $transaksi->update(['status' => $validated['status']]);
        
        // Log activity
        Log::info('Transaction status updated', [
            'transaction_id' => $transaksi->id,
            'invoice' => $transaksi->kode_invoice,
            'old_status' => $oldStatus,
            'new_status' => $validated['status'],
            'updated_by' => $user->name,
        ]);
        
        return back()->with('success', 'Status transaksi berhasil diupdate dari "' . $oldStatus . '" ke "' . $validated['status'] . '"');
    }

    // ------------------------------------------------------------------ updatePayment
    /**
     * Update payment status
     */
    public function updatePayment(Request $request, Transaksi $transaksi): RedirectResponse
    {
        $this->authorizePermission('transaksi.edit');
        
        $user = auth()->user();
        
        $isGlobal = $user->hasRole(['admin', 'owner']);
        
        // Outlet scoping for kasir
        if (!$isGlobal && $user->id_outlet !== null && $transaksi->id_outlet !== $user->id_outlet) {
            abort(403, 'Anda tidak memiliki akses ke transaksi ini.');
        }
        
        $validated = $request->validate([
            'dibayar' => 'required|in:' . implode(',', Transaksi::getAvailablePaymentStatuses()),
            'jumlah_bayar' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($request, $transaksi) {
                    if ($request->input('dibayar') === Transaksi::DIBAYAR_LUNAS) {
                        if ($value === null || $value === '') {
                             $fail('Jumlah uang diterima wajib diisi jika status Lunas.');
                             return;
                        }
                        
                        if ((float) $value < (float) $transaksi->total_akhir) {
                            $fail('Jumlah pembayaran kurang dari total tagihan.');
                        }
                    }
                }
            ],
        ]);
        
        DB::beginTransaction();
        try {
            $oldDibayar = $transaksi->dibayar;
            $isNewlyPaid = $validated['dibayar'] === Transaksi::DIBAYAR_LUNAS && 
                           $oldDibayar !== Transaksi::DIBAYAR_LUNAS;
            
            // Update payment status
            $updateData = [
                'dibayar' => $validated['dibayar'],
                'tgl_bayar' => $validated['dibayar'] === Transaksi::DIBAYAR_LUNAS ? now() : null,
            ];

            // If paying now, save amount and change
            if ($isNewlyPaid && isset($validated['jumlah_bayar'])) {
                $updateData['total_bayar'] = $validated['jumlah_bayar'];
                $updateData['kembalian'] = max(0, $validated['jumlah_bayar'] - $transaksi->total_akhir);
            }

            $transaksi->update($updateData);
            
            // Award points if newly paid and customer is member
            if ($isNewlyPaid && $transaksi->customer && $transaksi->customer->is_member) {
                $pointsEnabled = Setting::getValue('points_enabled', true);
                
                if ($pointsEnabled) {
                    // Calculate points from total_akhir
                    $earnedPoints = Customer::calculatePointsFromAmount($transaksi->total_akhir);
                    
                    if ($earnedPoints > 0) {
                        $transaksi->customer->addPoints(
                            $earnedPoints,
                            \App\Models\PointHistory::TYPE_EARN,
                            [
                                'transaction_amount' => $transaksi->total_akhir,
                                'reference_type' => 'App\Models\Transaksi',
                                'reference_id' => $transaksi->id,
                                'notes' => 'Poin dari transaksi ' . $transaksi->kode_invoice,
                                'created_by' => $user->id,
                            ]
                        );
                        
                        Log::info('Points awarded for transaction payment', [
                            'transaction_id' => $transaksi->id,
                            'customer_id' => $transaksi->customer->id,
                            'points' => $earnedPoints,
                        ]);
                    }
                }
            }
            
            DB::commit();
            
            $message = $isNewlyPaid 
                ? 'Pembayaran berhasil dikonfirmasi. Transaksi telah lunas.' 
                : 'Status pembayaran berhasil diupdate.';
            
            return back()->with('success', $message);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update payment status', [
                'transaction_id' => $transaksi->id,
                'error' => $e->getMessage(),
            ]);
            return back()->with('error', 'Gagal update status pembayaran: ' . $e->getMessage());
        }
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
            'distance_km' => 'nullable|numeric|min:0',
            'redeem_points' => 'nullable|integer|min:0',
            'payment_action' => 'required|in:bayar_lunas,bayar_nanti',
            'jumlah_bayar' => 'nullable|numeric|min:0',
            
            // Location Fields
            'customer_lat' => 'nullable|numeric|between:-90,90',
            'customer_lng' => 'nullable|numeric|between:-180,180',
            'alamat_lengkap' => 'nullable|string',
            'catatan_lokasi' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
        ], [
            'items.required' => 'Minimal harus ada 1 item',
            'items.min' => 'Minimal harus ada 1 item',
        ]);

        // Determine user capabilities
        $isGlobal = $user->hasRole(['admin', 'owner']);

        // Outlet scoping for kasir
        if (!$isGlobal && $user->id_outlet !== null && $validated['id_outlet'] != $user->id_outlet) {
            abort(403, 'Unauthorized outlet access');
        }

        $customer = $validated['id_customer'] ? Customer::find($validated['id_customer']) : null;

        try {
            DB::beginTransaction();

            // Resolve shipping distance
            $shippingDistance = $validated['distance_km'] ?? $validated['shipping_distance'] ?? 0;

            // Calculate totals
            $calculation = $this->calculateTransactionTotal(
                $validated['items'],
                $validated['surcharges'] ?? [],
                $validated['surcharge_distances'] ?? [],
                $validated['shipping_id'] ?? null,
                $shippingDistance,
                $validated['redeem_points'] ?? 0,
                $customer
            );

            // Parse dates with timezone
        $tz = 'Asia/Jakarta';
        $tgl = Carbon::parse($validated['tgl'], $tz);
        $batasWaktu = isset($validated['batas_waktu']) && $validated['batas_waktu'] !== ''
            ? Carbon::parse($validated['batas_waktu'], $tz)
            : null;

        // Prepare transaction data template
        $transactionDataTemplate = [
            'id_outlet' => $validated['id_outlet'],
            // 'kode_invoice' => GENERATED_INSIDE_LOOP,
            'id_customer' => $validated['id_customer'], 
            'tgl' => $tgl,
            'batas_waktu' => $batasWaktu, 
            'tgl_bayar' => $validated['payment_action'] === 'bayar_lunas' ? now() : null,
            
            // Financial fields
            'biaya_tambahan' => $calculation['total_surcharge'] ?? 0,
            'diskon' => $calculation['total_diskon'] ?? 0,
            'diskon_detail' => $calculation['diskon_detail'] ?? null,
            'pajak' => $calculation['pajak_amount'] ?? 0,
            'total_akhir' => $calculation['total_akhir'] ?? 0,
            
            'status' => Transaksi::STATUS_BARU,
            'dibayar' => $validated['payment_action'] === 'bayar_lunas' 
                ? Transaksi::DIBAYAR_LUNAS 
                : Transaksi::DIBAYAR_BELUM,
            'total_bayar' => $validated['payment_action'] === 'bayar_lunas' ? ($validated['jumlah_bayar'] ?? 0) : 0,
            'kembalian' => $validated['payment_action'] === 'bayar_lunas' 
                ? max(0, ($validated['jumlah_bayar'] ?? 0) - ($calculation['total_akhir'] ?? 0)) 
                : 0,
            'id_user' => $user->id,
            
            // Location fields
            'customer_lat' => $validated['customer_lat'] ?? null,
            'customer_lng' => $validated['customer_lng'] ?? null,
            'alamat_lengkap' => $validated['alamat_lengkap'] ?? null,
            'catatan_lokasi' => $validated['catatan_lokasi'] ?? null,
            'distance_km' => $shippingDistance > 0 ? $shippingDistance : 0,
            'shipping_cost' => $calculation['shipping_cost'] ?? 0,
        ];

        // RETRY LOGIC FOR INVOICE GENERATION (Concurrency Handling)
        $transaksi = null;
        $maxRetries = 3;
        $attempt = 0;

        while ($transaksi === null && $attempt < $maxRetries) {
            try {
                // Generate invoice code
                $invoiceCode = $this->generateInvoiceCode($validated['id_outlet']);
                
                // Set invoice code
                $transactionData = $transactionDataTemplate;
                $transactionData['kode_invoice'] = $invoiceCode;

                // Attempt to create transaction
                $transaksi = Transaksi::create($transactionData);
                
            } catch (\Illuminate\Database\QueryException $e) {
                // Check for Unique Constraint Violation (SQLSTATE 23000 / 23505)
                if ($e->getCode() === '23000' || $e->getCode() === '23505') {
                    $attempt++;
                    if ($attempt >= $maxRetries) {
                        throw $e; // Give up after max retries
                    }
                    // Wait a bit before retrying (backoff)
                    usleep(100000); // 100ms
                    continue; 
                }
                throw $e; // Rethrow other errors
            }
        }

            // Create detail transactions
            foreach ($validated['items'] as $item) {
                $transaksi->detailTransaksis()->create([
                    'id_paket' => $item['id_paket'],
                    'qty' => $item['qty'],
                    'keterangan' => $item['keterangan'] ?? null,
                ]);
            }

            // Handle points redemption
            if ($customer && ($calculation['actual_redeem_points'] ?? 0) > 0) {
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
                $earnedPoints = $calculation['earned_points'] ?? 0;
                if ($earnedPoints > 0) {
                    $customer->addPoints($earnedPoints, 'earn', [
                        'transaction_amount' => $calculation['gross_total_for_points'] ?? 0,
                        'reference_type' => 'App\Models\Transaksi',
                        'reference_id' => $transaksi->id,
                        'notes' => "Pembayaran transaksi {$transaksi->kode_invoice}",
                        'created_by' => $user->id,
                    ]);
                }
            }

            // Update customer address if provided
            if ($customer && !empty($validated['alamat_lengkap'])) {
                $updateData = ['alamat' => $validated['alamat_lengkap']];
                
                if (isset($validated['customer_lat']) && isset($validated['customer_lng'])) {
                    $updateData['latitude'] = $validated['customer_lat'];
                    $updateData['longitude'] = $validated['customer_lng'];
                }
                
                $customer->update($updateData);
            }

            // Auto-member check
            if ($customer && !$customer->is_member) {
                $autoMemberEnabled = Setting::getValue('auto_member_enabled', true);
                $requiredTransactions = (int) Setting::getValue('auto_member_transaction_count', 5);
                
                if ($autoMemberEnabled) {
                    $completedCount = Transaksi::where('id_customer', $customer->id)
                        ->where('status', '!=', 'batal')
                        ->count();

                    if ($completedCount >= $requiredTransactions) {
                        $customer->update(['is_member' => true]);
                        session()->flash('success', "🎉 Selamat! Customer otomatis diupgrade ke Member setelah {$requiredTransactions} transaksi!");
                    }
                }
            }

            DB::commit();

            $redirect = redirect()->route('transaksi.show', $transaksi->id)
                ->with('success', 'Transaksi berhasil dibuat!');
            
            if ($validated['payment_action'] === 'bayar_lunas') {
                $redirect->with('print_receipt', true);
            }

            return $redirect;
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transaction creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'validated_data' => $validated,
            ]);
            
            return redirect()->back()
                ->withInput()
                ->with('error', 'Gagal membuat transaksi: ' . $e->getMessage());
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
     * FIXED: Use LIV[OutletID][Date][Seq] format (Outlet Scoped)
     */
    private function generateInvoiceCode($outletId): string
    {
        $today = now()->format('Ymd');
        // Prefix: LIV + OutletID + Date
        // Example: LIV120260210
        $prefix = "LIV{$outletId}{$today}";

        // Check sequence for THIS outlet only
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

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate transaction total with proper null handling
     * FIXED: Ensure all return values have defaults
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

        // Step 3: Calculate shipping separately
        $shippingCost = 0;
        if ($shippingId) {
            $shipping = Surcharge::find($shippingId);
            if ($shipping && $shipping->isShipping()) {
                if ($shipping->min_order_total && $subtotalItems >= $shipping->min_order_total) {
                    $shippingCost = 0; // Free shipping
                } else {
                    switch ($shipping->calculation_type) {
                        case 'percent':
                            $shippingCost = ($subtotalItems * $shipping->nominal) / 100;
                            break;
                        case 'distance':
                            $shippingCost = $shipping->nominal * $shippingDistance;
                            break;
                        case 'fixed':
                        default:
                            $shippingCost = floatval($shipping->nominal);
                            break;
                    }
                }
            }
        }

        // Base for discount = Items + Surcharges (exclude shipping)
        $baseForDiscount = $subtotalItems + $totalSurcharge;
        $grossTotalForPoints = $baseForDiscount;

        // Apply automatic multiple promos
        $promoResult = Promo::calculateStackedDiscounts($customer, $baseForDiscount);
        $diskonPromo = $promoResult['total_discount'] ?? 0;
        $appliedPromos = $promoResult['discounts'] ?? [];

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
                'id' => $promo['id'] ?? null,
                'type' => 'promo',
                'nama' => $promo['nama'] ?? 'Promo',
                'jenis' => $promo['jenis'] ?? 'fixed',
                'nilai' => $promo['nilai'] ?? 0,
                'amount' => $promo['amount'] ?? 0,
                'is_member_only' => $promo['is_member_only'] ?? false,
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

        // Add shipping AFTER discount
        $totalDenganShipping = $totalSetelahDiskon + $shippingCost;

        // Calculate tax
        $taxRate = (float) Setting::getValue('tax_rate', 11);
        $autoApplyTax = Setting::getValue('auto_apply_tax', true);
        $pajakAmount = $autoApplyTax ? ($totalDenganShipping * $taxRate / 100) : 0;

        // Total akhir
        $totalAkhir = $totalDenganShipping + $pajakAmount;

        // Points earned
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
            'diskon_detail' => $diskonDetail,
            'applied_promos' => $appliedPromos,
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