import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, DollarSign, Award, Percent, Gift, TrendingUp } from 'lucide-react';

export default function SettingsIndex({ settings, flash }) {
    const [settingsData, setSettingsData] = useState({});

    useEffect(() => {
        const data = {};
        settings.forEach(setting => {
            let value = setting.value;
            if (setting.type === 'boolean') {
                value = setting.value === 'true' || setting.value === true;
            } else if (setting.type === 'number') {
                value = parseFloat(setting.value) || 0; // FIX: Default to 0 if empty
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

    const { post, processing } = useForm();

    const handleSubmit = (e) => {
        e.preventDefault();

        const settingsArray = Object.entries(settingsData).map(([key, value]) => ({
            key,
            value: String(value)
        }));

        post(route('settings.bulk-update'), {
            data: { settings: settingsArray },
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Pengaturan berhasil disimpan!');
            },
            onError: (errors) => {
                console.error('Errors:', errors);
                toast.error('Gagal menyimpan pengaturan');
            }
        });
    };

    // FIX: Handle empty input properly
    const updateSetting = (key, value) => {
        setSettingsData(prev => ({
            ...prev,
            [key]: value === '' ? 0 : value // Convert empty string to 0
        }));
    };

    // Calculate examples
    const exampleTransaction = 100000;
    const earnedPoints = Math.floor(exampleTransaction / (settingsData.points_earn_ratio || 10000));
    const pointsValue = earnedPoints * (settingsData.points_redeem_value || 500);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Pengaturan Bisnis
                </h2>
            }
        >
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

                        {/* Member Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5" />
                                    Pengaturan Member
                                </CardTitle>
                                <CardDescription>
                                    Benefit untuk pelanggan member
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="member_discount" className="flex items-center gap-2">
                                        <Percent className="h-4 w-4" />
                                        Diskon Member Otomatis (%)
                                    </Label>
                                    <Input
                                        id="member_discount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={settingsData.member_discount || ''}
                                        onChange={(e) => updateSetting('member_discount', e.target.value)}
                                        placeholder="0"
                                        className="mt-1"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Diskon yang diberikan otomatis untuk pelanggan member. Set 0 untuk tidak ada diskon otomatis.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* NEW: Points System Settings */}
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
                                {/* Enable/Disable Points */}
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

                                {/* Points Earn Ratio */}
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

                                {/* Points Redeem Value */}
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

                                {/* Example Calculation */}
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