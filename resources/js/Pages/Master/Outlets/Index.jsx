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
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

export default function OutletsIndex({ outlets, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        alamat: '',
        tlp: '',
    });

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const openCreateDialog = () => {
        setEditingOutlet(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (outlet) => {
        setEditingOutlet(outlet);
        setData({
            nama: outlet.nama,
            alamat: outlet.alamat,
            tlp: outlet.tlp,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingOutlet(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingOutlet) {
            put(route('outlets.update', editingOutlet.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('outlets.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (outlet) => {
        if (confirm(`Yakin ingin menghapus outlet "${outlet.nama}"?`)) {
            router.delete(route('outlets.destroy', outlet.id));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('outlets.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Data Outlet
                </h2>
            }
        >
            <Head title="Data Outlet" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            {/* Header Actions */}
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari outlet..."
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
                                    Tambah Outlet
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama Outlet</TableHead>
                                            <TableHead>Alamat</TableHead>
                                            <TableHead>Telepon</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outlets.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                    Tidak ada data outlet
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            outlets.data.map((outlet, index) => (
                                                <TableRow key={outlet.id}>
                                                    <TableCell>{outlets.from + index}</TableCell>
                                                    <TableCell className="font-medium">{outlet.nama}</TableCell>
                                                    <TableCell>{outlet.alamat}</TableCell>
                                                    <TableCell>{outlet.tlp}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(outlet)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(outlet)}
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

                            {/* Pagination */}
                            {outlets.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {outlets.links.map((link, index) => (
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

            {/* Dialog Form */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="nama">Nama Outlet *</Label>
                                <Input
                                    id="nama"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    className={errors.nama ? 'border-red-500' : ''}
                                />
                                {errors.nama && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="alamat">Alamat *</Label>
                                <Input
                                    id="alamat"
                                    value={data.alamat}
                                    onChange={(e) => setData('alamat', e.target.value)}
                                    className={errors.alamat ? 'border-red-500' : ''}
                                />
                                {errors.alamat && (
                                    <p className="mt-1 text-sm text-red-500">{errors.alamat}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="tlp">Telepon *</Label>
                                <Input
                                    id="tlp"
                                    value={data.tlp}
                                    onChange={(e) => setData('tlp', e.target.value)}
                                    className={errors.tlp ? 'border-red-500' : ''}
                                />
                                {errors.tlp && (
                                    <p className="mt-1 text-sm text-red-500">{errors.tlp}</p>
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