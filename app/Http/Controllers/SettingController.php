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
        // Get all business logic settings
        $settings = Setting::whereIn('key', [
            'tax_rate',
            'auto_apply_tax',
            'points_enabled',
            'points_earn_ratio',
            'points_redeem_value',
        ])->get();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Bulk update settings - FIXED
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