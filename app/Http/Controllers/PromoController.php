<?php

namespace App\Http\Controllers;

use App\Models\Promo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class PromoController extends Controller
{
    /**
     * Display a listing of promos.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $statusFilter = $request->input('status_filter'); // 'all', 'active', 'inactive'
        
        $promos = Promo::query()
            ->when($search, function ($query, $search) {
                $query->where('nama_promo', 'like', "%{$search}%")
                      ->orWhere('keterangan', 'like', "%{$search}%");
            })
            ->when($statusFilter === 'active', function ($query) {
                $query->where('is_active', true);
            })
            ->when($statusFilter === 'inactive', function ($query) {
                $query->where('is_active', false);
            })
            ->orderBy('priority', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Finance/Promos/Index', [
            'promos' => $promos,
            'filters' => $request->only(['search', 'status_filter']),
        ]);
    }

    /**
     * Store a newly created promo.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama_promo' => 'required|string|max:255',
            'diskon' => 'required|numeric|min:0',
            'jenis' => 'required|in:fixed,percent',
            'syarat_member_only' => 'boolean',
            'is_active' => 'boolean',
            'is_stackable' => 'boolean',
            'priority' => 'nullable|integer|min:1',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'minimal_transaksi' => 'nullable|numeric|min:0',
            'keterangan' => 'nullable|string',
        ], [
            'nama_promo.required' => 'Nama promo wajib diisi',
            'diskon.required' => 'Nilai diskon wajib diisi',
            'diskon.min' => 'Nilai diskon harus lebih dari 0',
            'jenis.required' => 'Jenis diskon wajib dipilih',
            'jenis.in' => 'Jenis diskon tidak valid',
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai harus setelah atau sama dengan tanggal mulai',
            'priority.min' => 'Prioritas minimal 1',
        ]);

        // Set default priority if not provided
        if (!isset($validated['priority'])) {
            $validated['priority'] = 100;
        }

        // Set default stackable if not provided
        if (!isset($validated['is_stackable'])) {
            $validated['is_stackable'] = true;
        }

        try {
            Promo::create($validated);

            return redirect()->back()->with('success', 'Promo berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan promo: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified promo.
     */
    public function update(Request $request, Promo $promo): RedirectResponse
    {
        $validated = $request->validate([
            'nama_promo' => 'required|string|max:255',
            'diskon' => 'required|numeric|min:0',
            'jenis' => 'required|in:fixed,percent',
            'syarat_member_only' => 'boolean',
            'is_active' => 'boolean',
            'is_stackable' => 'boolean',
            'priority' => 'nullable|integer|min:1',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'minimal_transaksi' => 'nullable|numeric|min:0',
            'keterangan' => 'nullable|string',
        ], [
            'nama_promo.required' => 'Nama promo wajib diisi',
            'diskon.required' => 'Nilai diskon wajib diisi',
            'diskon.min' => 'Nilai diskon harus lebih dari 0',
            'jenis.required' => 'Jenis diskon wajib dipilih',
            'jenis.in' => 'Jenis diskon tidak valid',
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai harus setelah atau sama dengan tanggal mulai',
            'priority.min' => 'Prioritas minimal 1',
        ]);

        try {
            $promo->update($validated);

            return redirect()->back()->with('success', 'Promo berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate promo: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified promo.
     */
    public function destroy(Promo $promo): RedirectResponse
    {
        try {
            $promo->delete();

            return redirect()->back()->with('success', 'Promo berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus promo: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active status
     */
    public function toggleActive(Promo $promo): RedirectResponse
    {
        try {
            $promo->update([
                'is_active' => !$promo->is_active
            ]);

            $status = $promo->is_active ? 'diaktifkan' : 'dinonaktifkan';
            return redirect()->back()->with('success', "Promo berhasil {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status: ' . $e->getMessage());
        }
    }

    /**
     * NEW: Toggle stackable status
     */
    public function toggleStackable(Promo $promo): RedirectResponse
    {
        try {
            $promo->update([
                'is_stackable' => !$promo->is_stackable
            ]);

            $status = $promo->is_stackable ? 'dapat dikombinasikan' : 'tidak dapat dikombinasikan';
            return redirect()->back()->with('success', "Promo berhasil diubah menjadi {$status}!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengubah status: ' . $e->getMessage());
        }
    }

    /**
     * NEW: Update priority order
     */
    public function updatePriority(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'priorities' => 'required|array',
            'priorities.*.id' => 'required|exists:promos,id',
            'priorities.*.priority' => 'required|integer|min:1',
        ]);

        try {
            foreach ($validated['priorities'] as $item) {
                Promo::where('id', $item['id'])->update(['priority' => $item['priority']]);
            }

            return redirect()->back()->with('success', 'Urutan prioritas promo berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate prioritas: ' . $e->getMessage());
        }
    }
}