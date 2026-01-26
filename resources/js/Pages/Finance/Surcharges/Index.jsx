import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search, DollarSign, Percent, CreditCard, MapPin, Gift, Truck } from 'lucide-react';

export default function SurchargesIndex({ surcharges, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSurcharge, setEditingSurcharge] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        nominal: '',
        calculation_type: 'fixed',
        min_order_total: '',
        keterangan: '',
        is_active: true,
    });

    // State for free shipping toggle
    const [enableFreeShipping, setEnableFreeShipping] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const openCreateDialog = () => {
        setEditingSurcharge(null);
        reset();
        setEnableFreeShipping(false);
        setIsDialogOpen(true);
    };

    const openEditDialog = (surcharge) => {
        setEditingSurcharge(surcharge);
        setData({
            nama: surcharge.nama,
            nominal: surcharge.nominal,
            calculation_type: surcharge.calculation_type,
            min_order_total: surcharge.min_order_total || '',
            keterangan: surcharge.keterangan || '',
            is_active: surcharge.is_active,
        });
        setEnableFreeShipping(!!surcharge.min_order_total);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingSurcharge(null);
        setEnableFreeShipping(false);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // If free shipping is disabled, clear min_order_total
        const submitData = {
            ...data,
            min_order_total: enableFreeShipping ? data.min_order_total : null
        };

        if (editingSurcharge) {
            put(route('surcharges.update', editingSurcharge.id), {
                data: submitData,
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('surcharges.store'), {
                data: submitData,
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (surcharge) => {
        if (confirm(`Yakin ingin menghapus biaya "${surcharge.nama}"?`)) {
            router.delete(route('surcharges.destroy', surcharge.id));
        }
    };

    const handleToggleActive = (surcharge) => {
        router.post(route('surcharges.toggle-active', surcharge.id));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('surcharges.index'), { 
            search: searchTerm,
            status_filter: statusFilter 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (value) => {
        setStatusFilter(value);
        router.get(route('surcharges.index'), { 
            search: searchTerm,
            status_filter: value 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const formatNominal = (nominal, type) => {
        switch(type) {
            case 'percent':
                return `${nominal}%`;
            case 'distance':
                return `Rp ${new Intl.NumberFormat('id-ID').format(nominal)}/km`;
            case 'fixed':
            default:
                return `Rp ${new Intl.NumberFormat('id-ID').format(nominal)}`;
        }
    };

    const formatRupiah = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'percent':
                return <Percent className="h-3 w-3" />;
            case 'distance':
                return <MapPin className="h-3 w-3" />;
            case 'fixed':
            default:
                return <DollarSign className="h-3 w-3" />;
        }
    };

    const getTypeBadge = (type) => {
        const variants = {
            fixed: { label: 'Nominal Tetap', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
            percent: { label: 'Persentase', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
            distance: { label: 'Per KM', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
        };
        return variants[type] || variants.fixed;
    };

    // Get label for nominal input based on calculation type
    const getNominalLabel = () => {
        switch(data.calculation_type) {
            case 'percent':
                return 'Persentase (%)';
            case 'distance':
                return 'Harga per KM (Rp)';
            case 'fixed':
            default:
                return 'Nominal (Rp)';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Biaya Tambahan
                </h2>
            }
        >
            <Head title="Biaya Tambahan" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari biaya tambahan..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" variant="outline" size="icon">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </form>
                                
                                <div className="flex gap-2">
                                    <Select value={statusFilter} onValueChange={handleFilterChange}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="active">Aktif Saja</SelectItem>
                                            <SelectItem value="inactive">Nonaktif Saja</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button onClick={openCreateDialog}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tambah Biaya
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama Biaya</TableHead>
                                            <TableHead className="text-center">Tipe</TableHead>
                                            <TableHead className="text-right">Nominal</TableHead>
                                            <TableHead className="text-center">Gratis Ongkir</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right w-[150px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {surcharges.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data biaya tambahan</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            surcharges.data.map((surcharge, index) => (
                                                <TableRow key={surcharge.id}>
                                                    <TableCell>{surcharges.from + index}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {surcharge.calculation_type === 'distance' && (
                                                                <Truck className="h-4 w-4 text-green-600" />
                                                            )}
                                                            {surcharge.nama}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`flex items-center gap-1 w-fit mx-auto ${getTypeBadge(surcharge.calculation_type).className}`}
                                                        >
                                                            {getTypeIcon(surcharge.calculation_type)}
                                                            {getTypeBadge(surcharge.calculation_type).label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatNominal(surcharge.nominal, surcharge.calculation_type)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {surcharge.min_order_total ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Badge variant="outline" className="border-green-500 text-green-600 flex items-center gap-1">
                                                                    <Gift className="h-3 w-3" />
                                                                    Aktif
                                                                </Badge>
                                                                <span className="text-xs text-gray-500">
                                                                    Min. {formatRupiah(surcharge.min_order_total)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="secondary">Tidak</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm text-gray-600">
                                                        {surcharge.keterangan || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={surcharge.is_active}
                                                            onCheckedChange={() => handleToggleActive(surcharge)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(surcharge)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(surcharge)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {surcharges.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {surcharges.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => router.get(link.url)}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingSurcharge ? (
                                <>
                                    <Pencil className="h-5 w-5" />
                                    Edit Biaya Tambahan
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Tambah Biaya Tambahan
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="nama">Nama Biaya *</Label>
                                <Input
                                    id="nama"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    placeholder="Contoh: Ongkir, Biaya Parkir, Admin Fee"
                                    className={errors.nama ? 'border-red-500' : ''}
                                />
                                {errors.nama && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="calculation_type">Tipe Perhitungan *</Label>
                                <Select
                                    value={data.calculation_type}
                                    onValueChange={(value) => setData('calculation_type', value)}
                                >
                                    <SelectTrigger className={errors.calculation_type ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Nominal Tetap (Rp)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="percent">
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-4 w-4" />
                                                Persentase dari Subtotal (%)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="distance">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Per Kilometer (Rp/km)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.calculation_type && (
                                    <p className="mt-1 text-sm text-red-500">{errors.calculation_type}</p>
                                )}
                                
                                {/* Helper Text */}
                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                    {data.calculation_type === 'fixed' && (
                                        <p>• Nominal tetap yang akan ditambahkan ke transaksi</p>
                                    )}
                                    {data.calculation_type === 'percent' && (
                                        <p>• Persentase dari subtotal transaksi (sebelum pajak)</p>
                                    )}
                                    {data.calculation_type === 'distance' && (
                                        <p>• Biaya per kilometer (cocok untuk ongkir)</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="nominal">{getNominalLabel()} *</Label>
                                <Input
                                    id="nominal"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.nominal}
                                    onChange={(e) => setData('nominal', e.target.value)}
                                    placeholder="0"
                                    className={errors.nominal ? 'border-red-500' : ''}
                                />
                                {errors.nominal && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nominal}</p>
                                )}
                            </div>

                            {/* Free Shipping Logic */}
                            <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Gift className={`h-5 w-5 ${enableFreeShipping ? 'text-green-600' : 'text-gray-400'}`} />
                                        <div>
                                            <Label htmlFor="enable_free_shipping" className="cursor-pointer font-semibold">
                                                Aktifkan Gratis Ongkir
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Biaya gratis jika subtotal mencapai minimal tertentu
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        id="enable_free_shipping"
                                        checked={enableFreeShipping}
                                        onCheckedChange={(checked) => {
                                            setEnableFreeShipping(checked);
                                            if (!checked) {
                                                setData('min_order_total', '');
                                            }
                                        }}
                                    />
                                </div>

                                {enableFreeShipping && (
                                    <div>
                                        <Label htmlFor="min_order_total">Minimal Transaksi (Rp) *</Label>
                                        <Input
                                            id="min_order_total"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.min_order_total}
                                            onChange={(e) => setData('min_order_total', e.target.value)}
                                            placeholder="Contoh: 100000"
                                            className={errors.min_order_total ? 'border-red-500' : ''}
                                        />
                                        {errors.min_order_total && (
                                            <p className="mt-1 text-sm text-red-500">{errors.min_order_total}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Jika subtotal ≥ nilai ini, biaya akan menjadi Rp 0 (GRATIS)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="keterangan">Keterangan</Label>
                                <Input
                                    id="keterangan"
                                    value={data.keterangan}
                                    onChange={(e) => setData('keterangan', e.target.value)}
                                    placeholder="Keterangan tambahan (opsional)"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="is_active" className="cursor-pointer font-semibold">
                                        Status Aktif
                                    </Label>
                                    <p className="text-xs text-gray-500">
                                        {data.is_active ? 'Dapat dipilih di kasir' : 'Tidak muncul di kasir'}
                                    </p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}