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
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search, User } from 'lucide-react';

export default function MembersIndex({ members, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        alamat: '',
        jenis_kelamin: '',
        tlp: '',
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
        setEditingMember(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (member) => {
        setEditingMember(member);
        setData({
            nama: member.nama,
            alamat: member.alamat,
            jenis_kelamin: member.jenis_kelamin,
            tlp: member.tlp,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingMember(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingMember) {
            put(route('members.update', editingMember.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('members.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (member) => {
        if (confirm(`Yakin ingin menghapus member "${member.nama}"?`)) {
            router.delete(route('members.destroy', member.id));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('members.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    const getGenderBadge = (gender) => {
        if (gender === 'L') {
            return <Badge variant="default" className="bg-blue-500">Laki-laki</Badge>;
        }
        return <Badge variant="secondary" className="bg-pink-500 text-white">Perempuan</Badge>;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Data Member
                </h2>
            }
        >
            <Head title="Data Member" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            {/* Header Actions */}
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari member..."
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
                                    Tambah Member
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Alamat</TableHead>
                                            <TableHead className="text-center">Jenis Kelamin</TableHead>
                                            <TableHead>Telepon</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data member</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            members.data.map((member, index) => (
                                                <TableRow key={member.id}>
                                                    <TableCell>{members.from + index}</TableCell>
                                                    <TableCell className="font-medium">{member.nama}</TableCell>
                                                    <TableCell className="max-w-xs truncate">{member.alamat}</TableCell>
                                                    <TableCell className="text-center">
                                                        {getGenderBadge(member.jenis_kelamin)}
                                                    </TableCell>
                                                    <TableCell>{member.tlp}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(member)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(member)}
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
                            {members.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {members.links.map((link, index) => (
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMember ? 'Edit Member' : 'Tambah Member Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Nama */}
                            <div>
                                <Label htmlFor="nama">Nama Lengkap *</Label>
                                <Input
                                    id="nama"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    placeholder="Masukkan nama lengkap"
                                    className={errors.nama ? 'border-red-500' : ''}
                                />
                                {errors.nama && (
                                    <p className="mt-1 text-sm text-red-500">{errors.nama}</p>
                                )}
                            </div>

                            {/* Alamat */}
                            <div>
                                <Label htmlFor="alamat">Alamat *</Label>
                                <Input
                                    id="alamat"
                                    value={data.alamat}
                                    onChange={(e) => setData('alamat', e.target.value)}
                                    placeholder="Masukkan alamat lengkap"
                                    className={errors.alamat ? 'border-red-500' : ''}
                                />
                                {errors.alamat && (
                                    <p className="mt-1 text-sm text-red-500">{errors.alamat}</p>
                                )}
                            </div>

                            {/* Jenis Kelamin - Radio Button */}
                            <div>
                                <Label>Jenis Kelamin *</Label>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="laki"
                                            name="jenis_kelamin"
                                            value="L"
                                            checked={data.jenis_kelamin === 'L'}
                                            onChange={(e) => setData('jenis_kelamin', e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="laki" className="cursor-pointer">
                                            Laki-laki
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="perempuan"
                                            name="jenis_kelamin"
                                            value="P"
                                            checked={data.jenis_kelamin === 'P'}
                                            onChange={(e) => setData('jenis_kelamin', e.target.value)}
                                            className="h-4 w-4 text-pink-600 focus:ring-pink-500"
                                        />
                                        <label htmlFor="perempuan" className="cursor-pointer">
                                            Perempuan
                                        </label>
                                    </div>
                                </div>
                                {errors.jenis_kelamin && (
                                    <p className="mt-1 text-sm text-red-500">{errors.jenis_kelamin}</p>
                                )}
                            </div>

                            {/* Telepon */}
                            <div>
                                <Label htmlFor="tlp">Nomor Telepon *</Label>
                                <Input
                                    id="tlp"
                                    type="text"
                                    value={data.tlp}
                                    onChange={(e) => setData('tlp', e.target.value)}
                                    placeholder="08xxxxxxxxxx"
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