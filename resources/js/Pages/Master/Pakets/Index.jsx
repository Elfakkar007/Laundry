import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

export default function PaketsIndex({ pakets, outlets, packageTypes, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPaket, setEditingPaket] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        id_outlet: '',
        id_package_type: '',
        nama_paket: '',
        harga: '',
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
        setEditingPaket(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (paket) => {
        setEditingPaket(paket);
        setData({
            id_outlet: paket.id_outlet.toString(),
            id_package_type: paket.id_package_type.toString(),
            nama_paket: paket.nama_paket,
            harga: paket.harga,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingPaket(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingPaket) {
            put(route('pakets.update', editingPaket.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('pakets.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (paket) => {
        if (confirm(`Yakin ingin menghapus paket "${paket.nama_paket}"?`)) {
            router.delete(route('pakets.destroy', paket.id));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('pakets.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Data Paket
                </h2>
            }
        >
            <Head title="Data Paket" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari paket..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" variant="outline" size="icon">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </form>
                                
                                <Button onClick={openCreateDialog}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Tambah Paket
                                </Button>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama Paket</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead>Outlet</TableHead>
                                            <TableHead className="text-right">Harga</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pakets.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                    Tidak ada data paket
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            pakets.data.map((paket, index) => (
                                                <TableRow key={paket.id}>
                                                    <TableCell>{pakets.from + index}</TableCell>
                                                    <TableCell className="font-medium">{paket.nama_paket}</TableCell>
                                                    <TableCell>{paket.package_type?.nama}</TableCell>
                                                    <TableCell>{paket.outlet?.nama}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatRupiah(paket.harga)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(paket)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(paket)}
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

                            {pakets.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {pakets.links.map((link, index) => (
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
                        <DialogTitle>
                            {editingPaket ? 'Edit Paket' : 'Tambah Paket Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="id_outlet">Outlet *</Label>
                                <Select
                                    value={data.id_outlet}
                                    onValueChange={(value) => setData('id_outlet', value)}
                                >
                                    <SelectTrigger className={errors.id_outlet ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Outlet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {outlets.map((outlet) => (
                                            <SelectItem key={outlet.id} value={outlet.id.toString()}>
                                                {outlet.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.id_outlet && (
                                    <p className="mt-1 text-sm text-red-500">{errors.id_outlet}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="id_package_type">Jenis Paket *</Label>
                                <Select
                                    value={data.id_package_type}
                                    onValueChange={(value) => setData('id_package_type', value)}
                                >
                                    <SelectTrigger className={errors.id_package_type ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Jenis Paket" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packageTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.id_package_type && (
                                    <p className="mt-1 text-sm text-red-500">{errors.id_package_type}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="nama_paket">Nama Paket *</Label>
                                <Input
                                    id="nama_paket"
                                    value={data.nama_paket}
                                    onChange={(e) => setData('nama_paket', e.target.value)}
                                    placeholder="Contoh: Cuci Reguler"
                                    className={errors.nama_paket ? 'border-red-500' : ''}
                                />
                                {errors.nama_paket && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama_paket}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="harga">Harga *</Label>
                                <Input
                                    id="harga"
                                    type="number"
                                    value={data.harga}
                                    onChange={(e) => setData('harga', e.target.value)}
                                    placeholder="0"
                                    className={errors.harga ? 'border-red-500' : ''}
                                />
                                {errors.harga && (
                                    <p className="mt-1 text-sm text-red-500">{errors.harga}</p>
                                )}
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