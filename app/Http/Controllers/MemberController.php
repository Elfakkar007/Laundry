<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class MemberController extends Controller
{
    /**
     * Display a listing of members.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        
        $members = Member::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                      ->orWhere('alamat', 'like', "%{$search}%")
                      ->orWhere('tlp', 'like', "%{$search}%");
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Master/Members/Index', [
            'members' => $members,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created member.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'alamat' => 'required|string',
            'jenis_kelamin' => 'required|in:L,P',
            'tlp' => 'required|string|max:20',
        ], [
            'nama.required' => 'Nama member wajib diisi',
            'alamat.required' => 'Alamat wajib diisi',
            'jenis_kelamin.required' => 'Jenis kelamin wajib dipilih',
            'jenis_kelamin.in' => 'Jenis kelamin tidak valid',
            'tlp.required' => 'Nomor telepon wajib diisi',
        ]);

        try {
            Member::create($validated);

            return redirect()->back()->with('success', 'Member berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan member: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified member.
     */
    public function update(Request $request, Member $member): RedirectResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'alamat' => 'required|string',
            'jenis_kelamin' => 'required|in:L,P',
            'tlp' => 'required|string|max:20',
        ], [
            'nama.required' => 'Nama member wajib diisi',
            'alamat.required' => 'Alamat wajib diisi',
            'jenis_kelamin.required' => 'Jenis kelamin wajib dipilih',
            'jenis_kelamin.in' => 'Jenis kelamin tidak valid',
            'tlp.required' => 'Nomor telepon wajib diisi',
        ]);

        try {
            $member->update($validated);

            return redirect()->back()->with('success', 'Member berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate member: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified member.
     */
    public function destroy(Member $member): RedirectResponse
    {
        try {
            // Check if member has related transaksis
            if ($member->transaksis()->count() > 0) {
                return redirect()->back()->with('error', 'Member tidak dapat dihapus karena masih memiliki transaksi terkait.');
            }

            $member->delete();

            return redirect()->back()->with('success', 'Member berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus member: ' . $e->getMessage());
        }
    }
}