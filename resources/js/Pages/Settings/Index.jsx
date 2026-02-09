import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // ✅ Ganti useForm dengan router
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, DollarSign, Percent, Gift, TrendingUp, Crown } from 'lucide-react';

export default function SettingsIndex({ settings, flash }) {
    const [settingsData, setSettingsData] = useState({});
    const [processing, setProcessing] = useState(false); // ✅ State manual untuk loading

    useEffect(() => {
        const data = {};
        settings.forEach(setting => {
            let value = setting.value;
            if (setting.type === 'boolean') {
                value = setting.value === 'true' || setting.value === true;
            } else if (setting.type === 'number') {
                value = parseFloat(setting.value) || 0;
            }
            data[setting.key] = value;
        });
        setSettingsData(data);
    }, [settings]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const settingsArray = Object.entries(settingsData).map(([key, value]) => ({
            key,
            value: String(value)
        }));

        console.log('Submitting settings:', settingsArray); // Debug log

        setProcessing(true);

        // ✅ Gunakan router.post langsung
        router.post(route('settings.bulk-update'), 
            { settings: settingsArray }, // ✅ Data langsung di level root
            {
                preserveScroll: true,
                onSuccess: () => {
                    setProcessing(false);
                },
                onError: (errors) => {
                    console.error('Errors:', errors);
                    
                    // Show specific error messages
                    if (errors.settings) {
                        toast.error(errors.settings);
                    } else if (Object.keys(errors).length > 0) {
                        toast.error('Gagal menyimpan pengaturan: ' + Object.values(errors)[0]);
                    } else {
                        toast.error('Gagal menyimpan pengaturan');
                    }
                    setProcessing(false);
                },
                onFinish: () => {
                    setProcessing(false);
                }
            }
        );
    };

    const updateSetting = (key, value) => {
        setSettingsData(prev => ({
            ...prev,
            [key]: value === '' ? 0 : value
        }));
    };

    // Calculate examples
    const exampleTransaction = 100000;
    const earnedPoints = Math.floor(exampleTransaction / (settingsData.points_earn_ratio || 10000));
    const pointsValue = earnedPoints * (settingsData.points_redeem_value || 500);

    return (
        <AuthenticatedLayout header="Pengaturan Bisnis">
            <Head title="Pengaturan" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tax Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Pengaturan Pajak
                                </CardTitle>
                                <CardDescription>
                                    Konfigurasi perhitungan pajak pada transaksi
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="tax_rate" className="flex items-center gap-2">
                                        <Percent className="h-4 w-4" />
                                        Persentase Pajak (PPN) %
                                    </Label>
                                    <Input
                                        id="tax_rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={settingsData.tax_rate || ''}
                                        onChange={(e) => updateSetting('tax_rate', e.target.value)}
                                        placeholder="0"
                                        className="mt-1"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Default PPN Indonesia adalah 11%. Atur sesuai kebijakan bisnis Anda.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                    <div>
                                        <Label htmlFor="auto_apply_tax" className="cursor-pointer font-semibold flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Otomatis Terapkan Pajak
                                        </Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Pajak akan ditambahkan secara otomatis ke setiap transaksi
                                        </p>
                                    </div>
                                    <Switch
                                        id="auto_apply_tax"
                                        checked={settingsData.auto_apply_tax || false}
                                        onCheckedChange={(checked) => updateSetting('auto_apply_tax', checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Points System Settings */}
                        <Card className="border-2 border-amber-200 dark:border-amber-900">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10">
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-amber-600" />
                                    Sistem Poin Member (Loyalty Points)
                                </CardTitle>
                                <CardDescription>
                                    Konfigurasi sistem poin untuk meningkatkan loyalitas pelanggan
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10">
                                    <div>
                                        <Label htmlFor="points_enabled" className="cursor-pointer font-semibold flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Aktifkan Sistem Poin
                                        </Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Pelanggan akan mendapatkan poin dari setiap transaksi
                                        </p>
                                    </div>
                                    <Switch
                                        id="points_enabled"
                                        checked={settingsData.points_enabled || false}
                                        onCheckedChange={(checked) => updateSetting('points_enabled', checked)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="points_earn_ratio" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Kelipatan Belanja untuk 1 Poin (Rp)
                                    </Label>
                                    <Input
                                        id="points_earn_ratio"
                                        type="number"
                                        step="1000"
                                        min="0"
                                        value={settingsData.points_earn_ratio || ''}
                                        onChange={(e) => updateSetting('points_earn_ratio', e.target.value)}
                                        placeholder="10000"
                                        className="mt-1"
                                        disabled={!settingsData.points_enabled}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Contoh: Jika diset Rp 10.000, maka setiap belanja Rp 10.000 akan dapat 1 poin
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="points_redeem_value" className="flex items-center gap-2">
                                        <Gift className="h-4 w-4" />
                                        Nilai Tukar 1 Poin (Rp)
                                    </Label>
                                    <Input
                                        id="points_redeem_value"
                                        type="number"
                                        step="100"
                                        min="0"
                                        value={settingsData.points_redeem_value || ''}
                                        onChange={(e) => updateSetting('points_redeem_value', e.target.value)}
                                        placeholder="500"
                                        className="mt-1"
                                        disabled={!settingsData.points_enabled}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Contoh: Jika diset Rp 500, maka 1 poin dapat ditukar senilai Rp 500
                                    </p>
                                </div>

                                {settingsData.points_enabled && (
                                    <div className="p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50/50 dark:bg-amber-900/5">
                                        <div className="flex items-start gap-3">
                                            <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    Contoh Perhitungan
                                                </p>
                                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                    <p>
                                                        • Belanja Rp {exampleTransaction.toLocaleString('id-ID')} → 
                                                        <span className="font-semibold text-amber-600"> {earnedPoints} poin</span>
                                                    </p>
                                                    <p>
                                                        • {earnedPoints} poin dapat ditukar → 
                                                        <span className="font-semibold text-green-600"> Rp {pointsValue.toLocaleString('id-ID')}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Auto-Member Settings */}
                        <Card className="border-2 border-purple-200 dark:border-purple-900">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                                <CardTitle className="flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-purple-600" />
                                    Upgrade Otomatis ke Member
                                </CardTitle>
                                <CardDescription>
                                    Konfigurasi kapan customer otomatis diupgrade menjadi member
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                                    <div>
                                        <Label htmlFor="auto_member_enabled" className="cursor-pointer font-semibold flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Aktifkan Auto-Upgrade
                                        </Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Customer reguler akan otomatis menjadi member setelah transaksi tertentu
                                        </p>
                                    </div>
                                    <Switch
                                        id="auto_member_enabled"
                                        checked={settingsData.auto_member_enabled || false}
                                        onCheckedChange={(checked) => updateSetting('auto_member_enabled', checked)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="auto_member_transaction_count" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Jumlah Transaksi yang Dibutuhkan
                                    </Label>
                                    <Input
                                        id="auto_member_transaction_count"
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={settingsData.auto_member_transaction_count || ''}
                                        onChange={(e) => updateSetting('auto_member_transaction_count', e.target.value)}
                                        placeholder="5"
                                        className="mt-1"
                                        disabled={!settingsData.auto_member_enabled}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Contoh: Jika diset 5, customer akan menjadi member setelah 5 transaksi selesai
                                    </p>
                                </div>

                                {settingsData.auto_member_enabled && (
                                    <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50/50 dark:bg-purple-900/5">
                                        <div className="flex items-start gap-3">
                                            <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    Contoh Skenario
                                                </p>
                                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                    <p>
                                                        • Customer baru → Reguler (0 transaksi)
                                                    </p>
                                                    <p>
                                                        • Setelah transaksi ke-{settingsData.auto_member_transaction_count || 5} selesai →
                                                        <span className="font-semibold text-purple-600"> Otomatis upgrade ke Member! 🎉</span>
                                                    </p>
                                                    <p>
                                                        • Member mendapat benefit: Poin, Promo eksklusif
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4">
                            <Button type="submit" disabled={processing} size="lg" className="min-w-[200px]">
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}