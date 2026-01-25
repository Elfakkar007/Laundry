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
        $statusFilter = $request->input('status_filter'); // 'all', 'active', 'inactive'
        
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
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Finance/Surcharges/Index', [
            'surcharges' => $surcharges,
            'filters' => $request->only(['search', 'status_filter']),
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
            'jenis' => 'required|in:fixed,percent',
            'keterangan' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'nama.required' => 'Nama biaya tambahan wajib diisi',
            'nominal.required' => 'Nominal wajib diisi',
            'nominal.min' => 'Nominal harus lebih dari 0',
            'jenis.required' => 'Jenis wajib dipilih',
            'jenis.in' => 'Jenis tidak valid',
        ]);

        try {
            Surcharge::create($validated);

            return redirect()->back()->with('success', 'Biaya tambahan berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan biaya tambahan: ' . $e->getMessage());
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
            'jenis' => 'required|in:fixed,percent',
            'keterangan' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'nama.required' => 'Nama biaya tambahan wajib diisi',
            'nominal.required' => 'Nominal wajib diisi',
            'nominal.min' => 'Nominal harus lebih dari 0',
            'jenis.required' => 'Jenis wajib dipilih',
            'jenis.in' => 'Jenis tidak valid',
        ]);

        try {
            $surcharge->update($validated);

            return redirect()->back()->with('success', 'Biaya tambahan berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate biaya tambahan: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified surcharge.
     */
    public function destroy(Surcharge $surcharge): RedirectResponse
    {
        try {
            $surcharge->delete();

            return redirect()->back()->with('success', 'Biaya tambahan berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus biaya tambahan: ' . $e->getMessage());
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
            return redirect()->back()->with('success', "Biaya tambahan berhasil {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status: ' . $e->getMessage());
        }
    }
}