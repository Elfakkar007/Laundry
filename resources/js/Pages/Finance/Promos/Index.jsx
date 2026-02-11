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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Switch } from '@/Components/ui/switch';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search, Tag, Crown, Calendar, ShoppingCart, DollarSign, Percent } from 'lucide-react';

export default function PromosIndex({ promos, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');
    const [deleteItem, setDeleteItem] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama_promo: '',
        diskon: '',
        jenis: 'percent',
        syarat_member_only: false,
        is_active: true,
        tanggal_mulai: '',
        tanggal_selesai: '',
        minimal_transaksi: '',
        keterangan: '',
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
        setEditingPromo(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (promo) => {
        setEditingPromo(promo);
        setData({
            nama_promo: promo.nama_promo,
            diskon: promo.diskon,
            jenis: promo.jenis,
            syarat_member_only: promo.syarat_member_only,
            is_active: promo.is_active,
            tanggal_mulai: promo.tanggal_mulai || '',
            tanggal_selesai: promo.tanggal_selesai || '',
            minimal_transaksi: promo.minimal_transaksi || '',
            keterangan: promo.keterangan || '',
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingPromo(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingPromo) {
            put(route('promos.update', editingPromo.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('promos.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (promo) => {
        setDeleteItem({
            message: `Yakin ingin menghapus promo "${promo.nama_promo}"?`,
            route: route('promos.destroy', promo.id)
        });
    };

    const handleToggleActive = (promo) => {
        router.post(route('promos.toggle-active', promo.id));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('promos.index'), {
            search: searchTerm,
            status_filter: statusFilter
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (value) => {
        setStatusFilter(value);
        router.get(route('promos.index'), {
            search: searchTerm,
            status_filter: value
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const formatDiskon = (diskon, jenis) => {
        if (jenis === 'percent') {
            return `${diskon}%`;
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(diskon);
    };

    const formatRupiah = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (promo) => {
        if (!promo.is_active) {
            return <Badge variant="secondary">Nonaktif</Badge>;
        }

        const now = new Date();
        const start = promo.tanggal_mulai ? new Date(promo.tanggal_mulai) : null;
        const end = promo.tanggal_selesai ? new Date(promo.tanggal_selesai) : null;

        if (start && now < start) {
            return <Badge variant="outline" className="border-blue-500 text-blue-500">Belum Dimulai</Badge>;
        }

        if (end && now > end) {
            return <Badge variant="outline" className="border-red-500 text-red-500">Expired</Badge>;
        }

        return <Badge className="bg-green-600">Aktif</Badge>;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Promo & Diskon
                </h2>
            }
        >
            <Head title="Promo & Diskon" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari promo..."
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
                                        Tambah Promo
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama Promo</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead className="text-right">Diskon</TableHead>
                                            <TableHead className="text-center">Periode</TableHead>
                                            <TableHead className="text-center">Syarat</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right w-[150px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {promos.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                    <Tag className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data promo</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            promos.data.map((promo, index) => (
                                                <TableRow key={promo.id}>
                                                    <TableCell>{promos.from + index}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                {promo.nama_promo}
                                                                {promo.syarat_member_only && (
                                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                                )}
                                                            </div>
                                                            {promo.keterangan && (
                                                                <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                                                    {promo.keterangan}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                            {promo.jenis === 'percent' ? (
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
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        {formatDiskon(promo.diskon, promo.jenis)}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <div>
                                                                {formatDate(promo.tanggal_mulai)}
                                                                {promo.tanggal_selesai && (
                                                                    <>
                                                                        <br />
                                                                        s/d {formatDate(promo.tanggal_selesai)}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div>
                                                            {promo.syarat_member_only && (
                                                                <Badge variant="outline" className="mb-1 border-yellow-500 text-yellow-600">
                                                                    <Crown className="h-3 w-3 mr-1" />
                                                                    Member
                                                                </Badge>
                                                            )}
                                                            {promo.minimal_transaksi && (
                                                                <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                                                    <ShoppingCart className="h-3 w-3" />
                                                                    Min. {formatRupiah(promo.minimal_transaksi)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            {getStatusBadge(promo)}
                                                            <Switch
                                                                checked={promo.is_active}
                                                                onCheckedChange={() => handleToggleActive(promo)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(promo)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(promo)}
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

                            {promos.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {promos.links.map((link, index) => (
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingPromo ? (
                                <>
                                    <Pencil className="h-5 w-5" />
                                    Edit Promo
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Tambah Promo Baru
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="nama_promo">Nama Promo *</Label>
                                <Input
                                    id="nama_promo"
                                    value={data.nama_promo}
                                    onChange={(e) => setData('nama_promo', e.target.value)}
                                    placeholder="Contoh: Diskon Hari Kemerdekaan"
                                    className={errors.nama_promo ? 'border-red-500' : ''}
                                />
                                {errors.nama_promo && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama_promo}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="jenis">Jenis Diskon *</Label>
                                    <Select
                                        value={data.jenis}
                                        onValueChange={(value) => setData('jenis', value)}
                                    >
                                        <SelectTrigger className={errors.jenis ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Pilih Jenis" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percent">Persentase (%)</SelectItem>
                                            <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.jenis && (
                                        <p className="mt-1 text-sm text-red-500">{errors.jenis}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="diskon">
                                        {data.jenis === 'percent' ? 'Persentase Diskon (%)' : 'Nominal Diskon (Rp)'} *
                                    </Label>
                                    <Input
                                        id="diskon"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.diskon}
                                        onChange={(e) => setData('diskon', e.target.value)}
                                        placeholder="0"
                                        className={errors.diskon ? 'border-red-500' : ''}
                                    />
                                    {errors.diskon && (
                                        <p className="mt-1 text-sm text-red-500">{errors.diskon}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                                    <Input
                                        id="tanggal_mulai"
                                        type="date"
                                        value={data.tanggal_mulai}
                                        onChange={(e) => setData('tanggal_mulai', e.target.value)}
                                        className={errors.tanggal_mulai ? 'border-red-500' : ''}
                                    />
                                    {errors.tanggal_mulai && (
                                        <p className="mt-1 text-sm text-red-500">{errors.tanggal_mulai}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">Kosongkan untuk berlaku segera</p>
                                </div>

                                <div>
                                    <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                                    <Input
                                        id="tanggal_selesai"
                                        type="date"
                                        value={data.tanggal_selesai}
                                        onChange={(e) => setData('tanggal_selesai', e.target.value)}
                                        className={errors.tanggal_selesai ? 'border-red-500' : ''}
                                    />
                                    {errors.tanggal_selesai && (
                                        <p className="mt-1 text-sm text-red-500">{errors.tanggal_selesai}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">Kosongkan untuk tidak ada batas</p>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="minimal_transaksi">Minimal Transaksi (Rp)</Label>
                                <Input
                                    id="minimal_transaksi"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.minimal_transaksi}
                                    onChange={(e) => setData('minimal_transaksi', e.target.value)}
                                    placeholder="0"
                                    className={errors.minimal_transaksi ? 'border-red-500' : ''}
                                />
                                {errors.minimal_transaksi && (
                                    <p className="mt-1 text-sm text-red-500">{errors.minimal_transaksi}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">Kosongkan jika tidak ada minimal</p>
                            </div>

                            <div>
                                <Label htmlFor="keterangan">Keterangan</Label>
                                <Input
                                    id="keterangan"
                                    value={data.keterangan}
                                    onChange={(e) => setData('keterangan', e.target.value)}
                                    placeholder="Keterangan promo (opsional)"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10">
                                <div className="flex items-center gap-3">
                                    <Crown className={`h-5 w-5 ${data.syarat_member_only ? 'text-yellow-500' : 'text-gray-400'}`} />
                                    <div>
                                        <Label htmlFor="syarat_member_only" className="cursor-pointer font-semibold">
                                            Khusus Member
                                        </Label>
                                        <p className="text-xs text-gray-500">
                                            {data.syarat_member_only ? 'Hanya untuk pelanggan member' : 'Untuk semua pelanggan'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="syarat_member_only"
                                    checked={data.syarat_member_only}
                                    onCheckedChange={(checked) => setData('syarat_member_only', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="is_active" className="cursor-pointer font-semibold">
                                        Status Aktif
                                    </Label>
                                    <p className="text-xs text-gray-500">
                                        {data.is_active ? 'Promo aktif dan dapat digunakan' : 'Promo nonaktif'}
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteItem?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteItem?.route) {
                                    router.delete(deleteItem.route);
                                }
                                setDeleteItem(null);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}