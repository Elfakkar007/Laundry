<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PointHistory;
use App\Traits\HasAuthorization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class CustomerController extends Controller
{
    use HasAuthorization;

    /**
     * Display a listing of customers.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission('customer.view');

        $search = $request->input('search');
        $memberFilter = $request->input('member_filter');

        $customers = Customer::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                      ->orWhere('no_hp', 'like', "%{$search}%");
            })
            ->when($memberFilter === 'member', function ($query) {
                $query->members();
            })
            ->when($memberFilter === 'reguler', function ($query) {
                $query->reguler();
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Master/Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'member_filter']),
        ]);
    }

    /**
     * Store a newly created customer.
     *
     * Cashier quick-add only sends nama + no_hp (+ optional is_member).
     * Email has been removed from the system entirely.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission('customer.create');

        $validated = $request->validate([
            'nama'      => 'required|string|max:255',
            'no_hp'     => 'required|string|max:20|unique:customers,no_hp',
            'alamat'    => 'nullable|string',
            'is_member' => 'boolean',
        ], [
            'nama.required'  => 'Nama pelanggan wajib diisi',
            'no_hp.required' => 'Nomor HP wajib diisi',
            'no_hp.unique'   => 'Nomor HP sudah terdaftar',
        ]);

        try {
            Customer::create($validated);

            return redirect()->back()->with('success', 'Pelanggan berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan pelanggan: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified customer.
     */
    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $this->authorizePermission('customer.update');

        $validated = $request->validate([
            'nama'      => 'required|string|max:255',
            'no_hp'     => 'required|string|max:20|unique:customers,no_hp,' . $customer->id,
            'alamat'    => 'nullable|string',
            'is_member' => 'boolean',
        ], [
            'nama.required'  => 'Nama pelanggan wajib diisi',
            'no_hp.required' => 'Nomor HP wajib diisi',
            'no_hp.unique'   => 'Nomor HP sudah terdaftar',
        ]);

        try {
            $customer->update($validated);

            return redirect()->back()->with('success', 'Pelanggan berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate pelanggan: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified customer.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        $this->authorizePermission('customer.delete');

        try {
            // Business logic protection
            if ($customer->transaksis()->count() > 0) {
                return redirect()->back()->with('error', 'Pelanggan tidak dapat dihapus karena masih memiliki transaksi terkait.');
            }

            $customer->delete();

            return redirect()->back()->with('success', 'Pelanggan berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus pelanggan: ' . $e->getMessage());
        }
    }

    /**
     * Toggle member status (admin-only manual override).
     *
     * Auto-member is handled automatically in TransaksiController after
     * 5 successful transactions.  This endpoint remains available for
     * edge-case manual corrections by an admin.
     */
    public function toggleMember(Customer $customer): RedirectResponse
    {
        $this->authorizePermission('customer.update');

        try {
            $customer->update([
                'is_member' => !$customer->is_member
            ]);

            $status = $customer->is_member ? 'Member' : 'Reguler';
            return redirect()->back()->with('success', "Status pelanggan berhasil diubah menjadi {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status: ' . $e->getMessage());
        }
    }

    /**
     * Show customer detail with points history
     */
    public function show(Customer $customer): Response
    {
        $this->authorizePermission('customer.view');

        $customer->load(['pointHistories' => function ($query) {
            $query->with('createdBy')
                  ->orderBy('created_at', 'desc')
                  ->limit(50);
        }]);

        return Inertia::render('Master/Customers/Show', [
            'customer' => $customer,
            'pointHistories' => $customer->pointHistories,
            'pointsSettings' => [
                'enabled' => \App\Models\Setting::getValue('points_enabled', true),
                'earn_ratio' => \App\Models\Setting::getValue('points_earn_ratio', 10000),
                'redeem_value' => \App\Models\Setting::getValue('points_redeem_value', 500),
            ],
        ]);
    }

    /**
     * Adjust points manually (Admin only)
     */
    public function adjustPoints(Request $request, Customer $customer): RedirectResponse
    {
        $this->authorizePermission('customer.update');

        $validated = $request->validate([
            'action' => 'required|in:add,subtract',
            'points' => 'required|integer|min:1',
            'notes'  => 'required|string|max:500',
        ], [
            'action.required' => 'Pilih aksi tambah atau kurangi poin',
            'points.required' => 'Jumlah poin wajib diisi',
            'points.min'      => 'Jumlah poin minimal 1',
            'notes.required'  => 'Catatan wajib diisi',
        ]);

        try {
            $points = $validated['action'] === 'add'
                ? $validated['points']
                : -$validated['points'];

            // Check if deducting and points are insufficient
            if ($validated['action'] === 'subtract' && $customer->poin < $validated['points']) {
                return redirect()->back()->with('error', 'Poin pelanggan tidak mencukupi!');
            }

            $customer->adjustPoints($points, $validated['notes']);

            $action = $validated['action'] === 'add' ? 'ditambahkan' : 'dikurangi';
            return redirect()->back()->with('success', "Poin berhasil {$action}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menyesuaikan poin: ' . $e->getMessage());
        }
    }
}