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
import { Pencil, Trash2, Plus, Search, DollarSign, Percent, CreditCard } from 'lucide-react';

export default function SurchargesIndex({ surcharges, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSurcharge, setEditingSurcharge] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        nominal: '',
        jenis: 'fixed',
        keterangan: '',
        is_active: true,
    });

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
        setIsDialogOpen(true);
    };

    const openEditDialog = (surcharge) => {
        setEditingSurcharge(surcharge);
        setData({
            nama: surcharge.nama,
            nominal: surcharge.nominal,
            jenis: surcharge.jenis,
            keterangan: surcharge.keterangan || '',
            is_active: surcharge.is_active,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingSurcharge(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingSurcharge) {
            put(route('surcharges.update', editingSurcharge.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('surcharges.store'), {
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

    const formatNominal = (nominal, jenis) => {
        if (jenis === 'percent') {
            return `${nominal}%`;
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(nominal);
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
                                            <TableHead>Jenis</TableHead>
                                            <TableHead className="text-right">Nominal</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right w-[150px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {surcharges.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data biaya tambahan</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            surcharges.data.map((surcharge, index) => (
                                                <TableRow key={surcharge.id}>
                                                    <TableCell>{surcharges.from + index}</TableCell>
                                                    <TableCell className="font-medium">{surcharge.nama}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                            {surcharge.jenis === 'percent' ? (
                                                                <>
                                                                    <Percent className="h-3 w-3" />
                                                                    Persentase
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <DollarSign className="h-3 w-3" />
                                                                    Nominal
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatNominal(surcharge.nominal, surcharge.jenis)}
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
                <DialogContent className="max-w-md">
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
                                    placeholder="Contoh: Antar Jemput"
                                    className={errors.nama ? 'border-red-500' : ''}
                                />
                                {errors.nama && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="jenis">Jenis *</Label>
                                <Select
                                    value={data.jenis}
                                    onValueChange={(value) => setData('jenis', value)}
                                >
                                    <SelectTrigger className={errors.jenis ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                                        <SelectItem value="percent">Persentase (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.jenis && (
                                    <p className="mt-1 text-sm text-red-500">{errors.jenis}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="nominal">
                                    {data.jenis === 'percent' ? 'Persentase (%)' : 'Nominal (Rp)'}  *
                                </Label>
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