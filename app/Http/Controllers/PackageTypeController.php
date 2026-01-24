<?php

namespace App\Http\Controllers;

use App\Models\PackageType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class PackageTypeController extends Controller
{
    /**
     * Display a listing of package types.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        
        $packageTypes = PackageType::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%");
            })
            ->withCount('pakets')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Master/PackageTypes/Index', [
            'packageTypes' => $packageTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created package type.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255|unique:package_types,nama',
        ]);

        try {
            PackageType::create($validated);

            return redirect()->back()->with('success', 'Jenis Paket berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan jenis paket: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified package type.
     */
    public function update(Request $request, PackageType $packageType): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255|unique:package_types,nama,' . $packageType->id,
        ]);

        try {
            $packageType->update($validated);

            return redirect()->back()->with('success', 'Jenis Paket berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate jenis paket: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified package type.
     */
    public function destroy(PackageType $packageType): RedirectResponse
    {
        try {
            // Check if package type has related pakets
            if ($packageType->pakets()->count() > 0) {
                return redirect()->back()->with('error', 'Jenis Paket tidak dapat dihapus karena masih memiliki Paket terkait.');
            }

            $packageType->delete();

            return redirect()->back()->with('success', 'Jenis Paket berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus jenis paket: ' . $e->getMessage());
        }
    }
}