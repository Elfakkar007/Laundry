<?php

namespace App\Http\Controllers;

use App\Models\Outlet;
use App\Traits\HasAuthorization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class OutletController extends Controller
{
    use HasAuthorization;

    public function index(Request $request): Response
    {
        $this->authorizePermission('outlet.view');

        $search = $request->input('search');
        
        $outlets = Outlet::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                      ->orWhere('alamat', 'like', "%{$search}%")
                      ->orWhere('tlp', 'like', "%{$search}%");
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Master/Outlets/Index', [
            'outlets' => $outlets,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created outlet.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission('outlet.create');

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'alamat' => 'required|string',
            'tlp' => 'required|string|max:20',
        ]);

        try {
            Outlet::create($validated);

            return redirect()->back()->with('success', 'Outlet berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan outlet: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified outlet.
     */
    public function update(Request $request, Outlet $outlet): RedirectResponse
    {
        $this->authorizePermission('outlet.update');

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'alamat' => 'required|string',
            'tlp' => 'required|string|max:20',
        ]);

        try {
            $outlet->update($validated);

            return redirect()->back()->with('success', 'Outlet berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate outlet: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified outlet.
     */
    public function destroy(Outlet $outlet): RedirectResponse
    {
        $this->authorizePermission('outlet.delete');

        try {
            // Business logic protection: Check relationships
            if ($outlet->users()->count() > 0 || 
                $outlet->pakets()->count() > 0 || 
                $outlet->transaksis()->count() > 0) {
                return redirect()->back()->with('error', 'Outlet tidak dapat dihapus karena masih memiliki data terkait (Users, Pakets, atau Transaksi).');
            }

            $outlet->delete();

            return redirect()->back()->with('success', 'Outlet berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus outlet: ' . $e->getMessage());
        }
    }
}