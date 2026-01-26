import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, DollarSign, Award, Percent } from 'lucide-react';

export default function SettingsIndex({ settings, flash }) {
    const [settingsData, setSettingsData] = useState({});

    useEffect(() => {
        const data = {};
        settings.forEach(setting => {
            let value = setting.value;
            if (setting.type === 'boolean') {
                value = setting.value === 'true' || setting.value === true;
            } else if (setting.type === 'number') {
                value = parseFloat(setting.value);
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
            onSuccess: () => {
                toast.success('Pengaturan berhasil disimpan!');
            },
            onError: (errors) => {
                toast.error('Gagal menyimpan pengaturan');
            }
        });
    };

    const updateSetting = (key, value) => {
        setSettingsData(prev => ({
            ...prev,
            [key]: value
        }));
    };

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
                                        value={settingsData.tax_rate || 11}
                                        onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value))}
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
                                        value={settingsData.member_discount || 0}
                                        onChange={(e) => updateSetting('member_discount', parseFloat(e.target.value))}
                                        className="mt-1"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Diskon yang diberikan otomatis untuk pelanggan member. Set 0 untuk tidak ada diskon otomatis.
                                    </p>
                                </div>

                                <div className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10">
                                    <div className="flex items-start gap-3">
                                        <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Info Member Benefit
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Member akan mendapatkan diskon otomatis sebesar {settingsData.member_discount || 0}% 
                                                dari subtotal setiap transaksi. Diskon ini akan diterapkan sebelum pajak dihitung.
                                            </p>
                                        </div>
                                    </div>
                                </div>
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