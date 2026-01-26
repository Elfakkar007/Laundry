<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SettingController extends Controller
{
    /**
     * Display the settings page.
     */
    public function index(): Response
    {
        // Only get business logic settings
        $settings = Setting::whereIn('key', [
            'tax_rate',
            'member_discount',
            'auto_apply_tax'
        ])->get();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the specified setting.
     */
    public function update(Request $request, Setting $setting): RedirectResponse
    {
        $validated = $request->validate([
            'value' => 'required',
        ]);

        try {
            $setting->update($validated);

            return redirect()->back()->with('success', 'Pengaturan berhasil diupdate!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengupdate pengaturan: ' . $e->getMessage());
        }
    }

    /**
     * Bulk update settings
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        try {
            foreach ($validated['settings'] as $settingData) {
                Setting::where('key', $settingData['key'])
                    ->update(['value' => $settingData['value']]);
            }

            return redirect()->back()->with('success', 'Pengaturan berhasil disimpan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menyimpan pengaturan: ' . $e->getMessage());
        }
    }
}