import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, DollarSign, Building, Phone, MapPin, Award } from 'lucide-react';

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
                    Pengaturan Aplikasi
                </h2>
            }
        >
            <Head title="Pengaturan" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Company Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Informasi Perusahaan
                                </CardTitle>
                                <CardDescription>
                                    Data perusahaan yang akan muncul di struk dan laporan
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="company_name">Nama Perusahaan</Label>
                                    <Input
                                        id="company_name"
                                        value={settingsData.company_name || ''}
                                        onChange={(e) => updateSetting('company_name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="company_phone" className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        Nomor Telepon
                                    </Label>
                                    <Input
                                        id="company_phone"
                                        value={settingsData.company_phone || ''}
                                        onChange={(e) => updateSetting('company_phone', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="company_address" className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Alamat
                                    </Label>
                                    <Input
                                        id="company_address"
                                        value={settingsData.company_address || ''}
                                        onChange={(e) => updateSetting('company_address', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tax Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Pengaturan Pajak & Transaksi
                                </CardTitle>
                                <CardDescription>
                                    Konfigurasi perhitungan pajak dan transaksi
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="tax_rate">
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
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Default PPN Indonesia adalah 11%
                                    </p>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <Label htmlFor="auto_apply_tax" className="cursor-pointer font-semibold">
                                            Otomatis Terapkan Pajak
                                        </Label>
                                        <p className="text-xs text-gray-500">
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
                                    Benefit dan poin untuk pelanggan member
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="member_discount_percent">
                                        Diskon Member Otomatis (%)
                                    </Label>
                                    <Input
                                        id="member_discount_percent"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={settingsData.member_discount_percent || 5}
                                        onChange={(e) => updateSetting('member_discount_percent', parseFloat(e.target.value))}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Diskon yang diberikan otomatis untuk member
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="points_per_transaction">
                                        Poin per Rp 100.000
                                    </Label>
                                    <Input
                                        id="points_per_transaction"
                                        type="number"
                                        min="0"
                                        value={settingsData.points_per_transaction || 100}
                                        onChange={(e) => updateSetting('points_per_transaction', parseInt(e.target.value))}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Poin yang didapat member setiap transaksi Rp 100.000
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4">
                            <Button type="submit" disabled={processing} size="lg">
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