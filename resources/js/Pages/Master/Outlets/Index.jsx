import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import LocationPicker from '@/Components/LocationPicker';
import { Separator } from '@/Components/ui/separator';
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

/**
 * INSTRUKSI:
 * Replace file ini ke: resources/js/Pages/Master/Outlets/Index.jsx
 */
export default function OutletsIndex({ outlets, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [deleteItem, setDeleteItem] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        alamat: '',
        tlp: '',
        latitude: null,
        longitude: null,
    });
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);

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
            latitude: outlet.latitude,
            longitude: outlet.longitude,
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
        setDeleteItem({
            message: `Yakin ingin menghapus outlet "${outlet.nama}"?`,
            route: route('outlets.destroy', outlet.id)
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('outlets.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleLocationChange = async (location) => {
        // 1. Set koordinat dulu agar marker pindah instan
        setData(data => ({
            ...data,
            latitude: location.lat,
            longitude: location.lng
        }));

        // 2. Ambil alamat teks dari OpenStreetMap (Reverse Geocoding)
        setIsFetchingAddress(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=id`
            );
            const result = await response.json();

            if (result && result.display_name) {
                // Masukkan hasil alamat otomatis ke form data 'alamat'
                setData(prevData => ({
                    ...prevData,
                    latitude: location.lat,
                    longitude: location.lng,
                    alamat: result.display_name
                }));
            }
        } catch (error) {
            console.error("Gagal mengambil alamat:", error);
            toast.error("Gagal mendeteksi nama alamat otomatis.");
        } finally {
            setIsFetchingAddress(false);
        }
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
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6 md:grid-cols-2">

                            {/* KOLOM KIRI: Info Dasar */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nama">Nama Outlet *</Label>
                                    <Input
                                        id="nama"
                                        value={data.nama}
                                        onChange={(e) => setData('nama', e.target.value)}
                                        className={errors.nama ? 'border-red-500' : ''}
                                        placeholder="Contoh: Laundry Cabang Pusat"
                                    />
                                    {errors.nama && (
                                        <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="tlp">Telepon *</Label>
                                    <Input
                                        id="tlp"
                                        value={data.tlp}
                                        onChange={(e) => setData('tlp', e.target.value)}
                                        className={errors.tlp ? 'border-red-500' : ''}
                                        placeholder="0812..."
                                    />
                                    {errors.tlp && (
                                        <p className="mt-1 text-sm text-red-500">{errors.tlp}</p>
                                    )}
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        ℹ️ Pengaturan Ongkir
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Harga ongkir per-KM diatur secara global di halaman <strong>Biaya & Ongkir</strong>.
                                        Anda bisa membuat berbagai opsi ongkir (Express, Regular, dll) dengan harga berbeda.
                                    </p>
                                </div>
                            </div>

                            {/* KOLOM KANAN: Peta & Alamat Otomatis */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-base font-semibold mb-2 block">
                                        Lokasi Outlet
                                    </Label>

                                    {/* Map Component */}
                                    <div className="rounded-md border overflow-hidden relative">
                                        <LocationPicker
                                            initialLat={data.latitude || -6.2088}
                                            initialLng={data.longitude || 106.8456}
                                            onLocationChange={handleLocationChange}
                                            height="250px"
                                        />

                                        {/* Loading Overlay saat geser pin */}
                                        {isFetchingAddress && (
                                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                                                <span className="text-sm font-medium text-gray-800 bg-white px-3 py-1 rounded shadow">
                                                    Mencari alamat...
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 mb-2">
                                        Geser pin pada peta, alamat akan terisi otomatis.
                                    </p>
                                </div>

                                {/* ALAMAT TERDETEKSI */}
                                <div>
                                    <Label htmlFor="alamat_auto" className="flex justify-between">
                                        <span>Alamat Terdeteksi</span>
                                        <span className="text-xs font-normal text-gray-500">(Otomatis dari Peta)</span>
                                    </Label>

                                    <textarea
                                        id="alamat_auto"
                                        value={data.alamat || ''}
                                        onChange={(e) => setData('alamat', e.target.value)}
                                        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] ${errors.alamat ? 'border-red-500' : ''}`}
                                        placeholder="Pilih lokasi di peta untuk mengisi alamat otomatis..."
                                    />
                                    {errors.alamat && (
                                        <p className="mt-1 text-sm text-red-500">{errors.alamat}</p>
                                    )}
                                </div>

                                {/* Koordinat (Hidden/Readonly kecil) */}
                                <div className="grid grid-cols-2 gap-4 opacity-70">
                                    <div>
                                        <Label className="text-[10px] text-gray-400">Latitude</Label>
                                        <div className="text-xs font-mono bg-gray-50 p-1 rounded border">
                                            {data.latitude || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-gray-400">Longitude</Label>
                                        <div className="text-xs font-mono bg-gray-50 p-1 rounded border">
                                            {data.longitude || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing || isFetchingAddress}>
                                {processing ? 'Menyimpan...' : 'Simpan Outlet'}
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