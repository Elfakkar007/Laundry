<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $roleFilter = $request->input('role_filter');
        
        $users = User::query()
            ->with(['outlet', 'roles'])
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%");
            })
            ->when($roleFilter && $roleFilter !== 'all', function ($query) use ($roleFilter) {
                $query->role($roleFilter);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $roles = Role::all();
        $outlets = Outlet::select('id', 'nama')->orderBy('nama')->get();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'outlets' => $outlets,
            'filters' => $request->only(['search', 'role_filter']),
        ]);
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request): RedirectResponse
    {
        // Validation rules dengan logic conditional
        $rules = [
            'nama' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|exists:roles,name',
        ];

        // LOGIC: Kasir WAJIB punya outlet
        if ($request->role === 'kasir') {
            $rules['id_outlet'] = 'required|exists:outlets,id';
        } else {
            $rules['id_outlet'] = 'nullable|exists:outlets,id';
        }

        $validated = $request->validate($rules, [
            'nama.required' => 'Nama wajib diisi',
            'username.required' => 'Username wajib diisi',
            'username.unique' => 'Username sudah digunakan',
            'password.required' => 'Password wajib diisi',
            'password.confirmed' => 'Konfirmasi password tidak cocok',
            'role.required' => 'Role wajib dipilih',
            'id_outlet.required' => 'Outlet wajib dipilih untuk role Kasir',
        ]);

        try {
            // Create user
            $user = User::create([
                'nama' => $validated['nama'],
                'username' => $validated['username'],
                'password' => Hash::make($validated['password']),
                'id_outlet' => $validated['id_outlet'] ?? null,
            ]);

            // Assign role
            $user->assignRole($validated['role']);

            return redirect()->back()->with('success', 'User berhasil ditambahkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menambahkan user: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $rules = [
            'nama' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|exists:roles,name',
        ];

        // LOGIC: Kasir WAJIB punya outlet
        if ($request->role === 'kasir') {
            $rules['id_outlet'] = 'required|exists:outlets,id';
        } else {
            $rules['id_outlet'] = 'nullable|exists:outlets,id';
        }

        $validated = $request->validate($rules, [
            'nama.required' => 'Nama wajib diisi',
            'username.required' => 'Username wajib diisi',
            'username.unique' => 'Username sudah digunakan',
            'password.confirmed' => 'Konfirmasi password tidak cocok',
            'role.required' => 'Role wajib dipilih',
            'id_outlet.required' => 'Outlet wajib dipilih untuk role Kasir',
        ]);

        try {
            // Update user data
            $userData = [
                'nama' => $validated['nama'],
                'username' => $validated['username'],
                'id_outlet' => $validated['id_outlet'] ?? null,
            ];

            // Update password only if provided
            if (!empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }

            $user->update($userData);

            // Sync role (remove old, assign new)
            $user->syncRoles([$validated['role']]);

            return redirect()->back()->with('success', 'User berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate user: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified user
     */
    public function destroy(User $user): RedirectResponse
    {
        try {
            // Prevent self-deletion
            if ($user->id === auth()->id()) {
                return redirect()->back()->with('error', 'Tidak dapat menghapus akun sendiri!');
            }

            // Check if user has transactions
            if ($user->transaksis()->count() > 0) {
                return redirect()->back()->with('error', 'User tidak dapat dihapus karena memiliki transaksi terkait.');
            }

            $user->delete();

            return redirect()->back()->with('success', 'User berhasil dihapus!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus user: ' . $e->getMessage());
        }
    }
}