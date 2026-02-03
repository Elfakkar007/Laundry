<?php

namespace App\Http\Controllers;

use App\Models\Surcharge;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SurchargeController extends Controller
{
    /**
     * Display a listing of surcharges.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $statusFilter = $request->input('status_filter');
        $categoryFilter = $request->input('category_filter'); // NEW: Category filter
        
        $surcharges = Surcharge::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                      ->orWhere('keterangan', 'like', "%{$search}%");
            })
            ->when($statusFilter === 'active', function ($query) {
                $query->where('is_active', true);
            })
            ->when($statusFilter === 'inactive', function ($query) {
                $query->where('is_active', false);
            })
            // NEW: Filter by category
            ->when($categoryFilter === 'surcharge', function ($query) {
                $query->where('category', 'surcharge');
            })
            ->when($categoryFilter === 'shipping', function ($query) {
                $query->where('category', 'shipping');
            })
            ->orderBy('category', 'asc') // Sort by category first
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Finance/Surcharges/Index', [
            'surcharges' => $surcharges,
            'filters' => $request->only(['search', 'status_filter', 'category_filter']),
        ]);
    }

    /**
     * Store a newly created surcharge.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'nominal' => 'required|numeric|min:0',
            'calculation_type' => 'required|in:fixed,percent,distance',
            'category' => 'required|in:surcharge,shipping', // NEW: Validate category
            'min_order_total' => 'nullable|numeric|min:0',
            'keterangan' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'nama.required' => 'Nama wajib diisi',
            'nominal.required' => 'Nominal wajib diisi',
            'nominal.min' => 'Nominal harus lebih dari 0',
            'calculation_type.required' => 'Tipe perhitungan wajib dipilih',
            'calculation_type.in' => 'Tipe perhitungan tidak valid',
            'category.required' => 'Kategori wajib dipilih',
            'category.in' => 'Kategori tidak valid',
            'min_order_total.min' => 'Minimal transaksi harus lebih dari 0',
        ]);

        try {
            Surcharge::create($validated);

            return redirect()->back()->with('success', 'Biaya/Ongkir berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified surcharge.
     */
    public function update(Request $request, Surcharge $surcharge): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'nominal' => 'required|numeric|min:0',
            'calculation_type' => 'required|in:fixed,percent,distance',
            'category' => 'required|in:surcharge,shipping', // NEW: Validate category
            'min_order_total' => 'nullable|numeric|min:0',
            'keterangan' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'nama.required' => 'Nama wajib diisi',
            'nominal.required' => 'Nominal wajib diisi',
            'nominal.min' => 'Nominal harus lebih dari 0',
            'calculation_type.required' => 'Tipe perhitungan wajib dipilih',
            'calculation_type.in' => 'Tipe perhitungan tidak valid',
            'category.required' => 'Kategori wajib dipilih',
            'category.in' => 'Kategori tidak valid',
            'min_order_total.min' => 'Minimal transaksi harus lebih dari 0',
        ]);

        try {
            $surcharge->update($validated);

            return redirect()->back()->with('success', 'Biaya/Ongkir berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified surcharge.
     */
    public function destroy(Surcharge $surcharge): RedirectResponse
    {
        try {
            $surcharge->delete();
            return redirect()->back()->with('success', 'Biaya/Ongkir berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active status
     */
    public function toggleActive(Surcharge $surcharge): RedirectResponse
    {
        try {
            $surcharge->update([
                'is_active' => !$surcharge->is_active
            ]);

            $status = $surcharge->is_active ? 'diaktifkan' : 'dinonaktifkan';
            return redirect()->back()->with('success', "Biaya/Ongkir berhasil {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status: ' . $e->getMessage());
        }
    }
}