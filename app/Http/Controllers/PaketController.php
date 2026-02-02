<?php

namespace App\Http\Controllers;

use App\Models\Paket;
use App\Models\Outlet;
use App\Models\PackageType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class PaketController extends Controller
{
    /**
     * Display a listing of pakets.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        
        $pakets = Paket::query()
            ->with(['outlet', 'packageType'])
            ->when($search, function ($query, $search) {
                $query->where('nama_paket', 'like', "%{$search}%")
                      ->orWhereHas('outlet', function ($q) use ($search) {
                          $q->where('nama', 'like', "%{$search}%");
                      })
                      ->orWhereHas('packageType', function ($q) use ($search) {
                          $q->where('nama', 'like', "%{$search}%");
                      });
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $outlets = Outlet::select('id', 'nama')->orderBy('nama')->get();
        $packageTypes = PackageType::select('id', 'nama')->orderBy('nama')->get();

        return Inertia::render('Master/Pakets/Index', [
            'pakets' => $pakets,
            'outlets' => $outlets,
            'packageTypes' => $packageTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created paket.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'id_outlet' => 'required|exists:outlets,id',
            'id_package_type' => 'required|exists:package_types,id',
            'nama_paket' => 'required|string|max:255',
            'harga' => 'required|numeric|min:1',
        ], [
            'harga.min' => 'Harga minimal Rp 1',
        ]);

        try {
            Paket::create($validated);

            return redirect()->back()->with('success', 'Paket berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan paket: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified paket.
     */
    public function update(Request $request, Paket $paket): RedirectResponse
    {
        $validated = $request->validate([
            'id_outlet' => 'required|exists:outlets,id',
            'id_package_type' => 'required|exists:package_types,id',
            'nama_paket' => 'required|string|max:255',
            'harga' => 'required|numeric|min:1',
        ], [
            'harga.min' => 'Harga minimal Rp 1',
        ]);

        try {
            $paket->update($validated);

            return redirect()->back()->with('success', 'Paket berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate paket: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active status of the specified paket.
     */
    public function toggleActive(Paket $paket): RedirectResponse
    {
        try {
            $paket->update(['is_active' => !$paket->is_active]);

            $status = $paket->is_active ? 'diaktifkan' : 'dinonaktifkan';
            return redirect()->back()->with('success', "Paket berhasil {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status paket: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified paket.
     */
    public function destroy(Paket $paket): RedirectResponse
    {
        try {
            // Check if paket has related detail transaksis
            if ($paket->detailTransaksis()->count() > 0) {
                return redirect()->back()->with('error', 'Paket tidak dapat dihapus karena sudah digunakan dalam transaksi. Silakan nonaktifkan paket ini sebagai gantinya.');
            }

            $paket->delete();

            return redirect()->back()->with('success', 'Paket berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus paket: ' . $e->getMessage());
        }
    }
}