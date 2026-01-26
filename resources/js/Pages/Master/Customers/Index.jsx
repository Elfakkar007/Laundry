import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Badge } from '@/Components/ui/badge';
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
import { Pencil, Trash2, Plus, Search, Users, Crown, Phone, Mail, MapPin, Award, Eye, Gift } from 'lucide-react';

export default function CustomersIndex({ customers, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [memberFilter, setMemberFilter] = useState(filters.member_filter || 'all');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        no_hp: '',
        alamat: '',
        email: '',
        is_member: false,
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
        setEditingCustomer(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (customer) => {
        setEditingCustomer(customer);
        setData({
            nama: customer.nama,
            no_hp: customer.no_hp,
            alamat: customer.alamat || '',
            email: customer.email || '',
            is_member: customer.is_member,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingCustomer(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingCustomer) {
            put(route('customers.update', editingCustomer.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('customers.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (customer) => {
        if (confirm(`Yakin ingin menghapus pelanggan "${customer.nama}"?`)) {
            router.delete(route('customers.destroy', customer.id));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('customers.index'), { 
            search: searchTerm,
            member_filter: memberFilter 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (value) => {
        setMemberFilter(value);
        router.get(route('customers.index'), { 
            search: searchTerm,
            member_filter: value 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const getMemberBadge = (isMember, poin) => {
        if (isMember) {
            return (
                <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                        <Crown className="h-3 w-3 mr-1" />
                        Member
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        <Gift className="h-3 w-3 mr-1" />
                        {poin} poin
                    </Badge>
                </div>
            );
        }
        return <Badge variant="secondary">Reguler</Badge>;
    };

    const formatPhoneNumber = (phone) => {
        if (!phone) return '-';
        return phone.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Data Pelanggan
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total: {customers.total} pelanggan
                    </div>
                </div>
            }
        >
            <Head title="Data Pelanggan" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            {/* Header Actions */}
                            <div className="mb-6 flex flex-col gap-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                        <Input
                                            type="text"
                                            placeholder="Cari nama, HP, atau email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button type="submit" variant="outline" size="icon">
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </form>
                                    
                                    <div className="flex gap-2">
                                        <Select value={memberFilter} onValueChange={handleFilterChange}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Filter Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Pelanggan</SelectItem>
                                                <SelectItem value="member">Member Saja</SelectItem>
                                                <SelectItem value="reguler">Reguler Saja</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button onClick={openCreateDialog}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Tambah Pelanggan
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>No. HP</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-center">Status & Poin</TableHead>
                                            <TableHead className="text-right w-[150px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data pelanggan</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            customers.data.map((customer, index) => (
                                                <TableRow key={customer.id}>
                                                    <TableCell>{customers.from + index}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {customer.nama}
                                                            {customer.is_member && (
                                                                <Crown className="h-4 w-4 text-yellow-500" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Phone className="h-3 w-3 text-gray-400" />
                                                            {formatPhoneNumber(customer.no_hp)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {customer.email ? (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Mail className="h-3 w-3 text-gray-400" />
                                                                {customer.email}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getMemberBadge(customer.is_member, customer.poin)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => router.visit(route('customers.show', customer.id))}
                                                                title="Lihat Detail & Riwayat Poin"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(customer)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(customer)}
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
                            {customers.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {customers.links.map((link, index) => (
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
                        <DialogTitle className="flex items-center gap-2">
                            {editingCustomer ? (
                                <>
                                    <Pencil className="h-5 w-5" />
                                    Edit Pelanggan
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Tambah Pelanggan Baru
                                </>
                            )}
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

                            {/* No HP */}
                            <div>
                                <Label htmlFor="no_hp">Nomor HP *</Label>
                                <Input
                                    id="no_hp"
                                    type="text"
                                    value={data.no_hp}
                                    onChange={(e) => setData('no_hp', e.target.value)}
                                    placeholder="08xxxxxxxxxx"
                                    className={errors.no_hp ? 'border-red-500' : ''}
                                />
                                {errors.no_hp && (
                                    <p className="mt-1 text-sm text-red-500">{errors.no_hp}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Nomor HP akan menjadi identitas unik pelanggan
                                </p>
                            </div>

                            {/* Email */}
                            <div>
                                <Label htmlFor="email">Email (Opsional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="customer@example.com"
                                    className={errors.email ? 'border-red-500' : ''}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                )}
                            </div>

                            {/* Alamat */}
                            <div>
                                <Label htmlFor="alamat">Alamat (Opsional)</Label>
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

                            {/* Member Status */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10">
                                <div className="flex items-center gap-3">
                                    <Crown className={`h-5 w-5 ${data.is_member ? 'text-yellow-500' : 'text-gray-400'}`} />
                                    <div>
                                        <Label htmlFor="is_member" className="cursor-pointer font-semibold">
                                            Member Aktif
                                        </Label>
                                        <p className="text-xs text-gray-500">
                                            {data.is_member ? 'Pelanggan dengan benefit khusus' : 'Pelanggan reguler'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="is_member"
                                    checked={data.is_member}
                                    onCheckedChange={(checked) => setData('is_member', checked)}
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