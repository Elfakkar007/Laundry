import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
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
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

export default function PackageTypesIndex({ packageTypes, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [deleteItem, setDeleteItem] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
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
        setEditingType(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (type) => {
        setEditingType(type);
        setData({ nama: type.nama });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingType(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingType) {
            put(route('package-types.update', editingType.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('package-types.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (type) => {
        setDeleteItem({
            message: `Yakin ingin menghapus jenis paket "${type.nama}"?`,
            route: route('package-types.destroy', type.id)
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('package-types.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Jenis Paket
                </h2>
            }
        >
            <Head title="Jenis Paket" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari jenis paket..."
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
                                    Tambah Jenis Paket
                                </Button>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama Jenis Paket</TableHead>
                                            <TableHead className="text-center">Jumlah Paket</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {packageTypes.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    Tidak ada data jenis paket
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            packageTypes.data.map((type, index) => (
                                                <TableRow key={type.id}>
                                                    <TableCell>{packageTypes.from + index}</TableCell>
                                                    <TableCell className="font-medium">{type.nama}</TableCell>
                                                    <TableCell className="text-center">{type.pakets_count}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(type)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(type)}
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

                            {packageTypes.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {packageTypes.links.map((link, index) => (
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? 'Edit Jenis Paket' : 'Tambah Jenis Paket Baru'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="nama">Nama Jenis Paket *</Label>
                                <Input
                                    id="nama"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    placeholder="Contoh: Kiloan, Selimut, Bed Cover"
                                    className={errors.nama ? 'border-red-500' : ''}
                                />
                                {errors.nama && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
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