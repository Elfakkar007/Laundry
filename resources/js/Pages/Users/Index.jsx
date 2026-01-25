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
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Search, UserCog, AlertTriangle, Store, Shield } from 'lucide-react';

export default function UsersIndex({ users, roles, outlets, filters, flash }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role_filter || 'all');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama: '',
        username: '',
        password: '',
        password_confirmation: '',
        role: '',
        id_outlet: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openCreateDialog = () => {
        setEditingUser(null);
        reset();
        setIsDialogOpen(true);
    };

    const openEditDialog = (user) => {
        setEditingUser(user);
        setData({
            nama: user.nama,
            username: user.username,
            password: '',
            password_confirmation: '',
            role: user.roles[0]?.name || '',
            id_outlet: user.id_outlet?.toString() || '',
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingUser(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingUser) {
            put(route('users.update', editingUser.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('users.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (user) => {
        if (confirm(`Yakin ingin menghapus user "${user.nama}"?`)) {
            router.delete(route('users.destroy', user.id));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('users.index'), { 
            search: searchTerm,
            role_filter: roleFilter 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (value) => {
        setRoleFilter(value);
        router.get(route('users.index'), { 
            search: searchTerm,
            role_filter: value 
        }, {
            preserveState: true,
            replace: true,
        });
    };

    // Check if Kasir role selected
    const isKasirRole = data.role === 'kasir';

    const getRoleBadge = (roleName) => {
        const variants = {
            admin: { variant: 'default', className: 'bg-red-600' },
            kasir: { variant: 'default', className: 'bg-blue-600' },
            owner: { variant: 'default', className: 'bg-purple-600' },
        };
        return variants[roleName?.toLowerCase()] || { variant: 'outline' };
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    User Management
                </h2>
            }
        >
            <Head title="User Management" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                                    <Input
                                        type="text"
                                        placeholder="Cari nama atau username..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" variant="outline" size="icon">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </form>
                                
                                <div className="flex gap-2">
                                    <Select value={roleFilter} onValueChange={handleFilterChange}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Role</SelectItem>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.name}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button onClick={openCreateDialog}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tambah User
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead className="text-center">Role</TableHead>
                                            <TableHead className="text-center">Outlet</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    <UserCog className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada data user</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.data.map((user, index) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>{users.from + index}</TableCell>
                                                    <TableCell className="font-medium">{user.nama}</TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            @{user.username}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge {...getRoleBadge(user.roles[0]?.name)}>
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            {user.roles[0]?.name || 'No Role'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {user.outlet ? (
                                                            <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto">
                                                                <Store className="h-3 w-3" />
                                                                {user.outlet.nama}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Global</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => openEditDialog(user)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDelete(user)}
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

                            {users.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {users.links.map((link, index) => (
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
                            {editingUser ? (
                                <>
                                    <Pencil className="h-5 w-5" />
                                    Edit User
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Tambah User Baru
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
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

                            <div>
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    placeholder="username_unik"
                                    className={errors.username ? 'border-red-500' : ''}
                                />
                                {errors.username && (
                                    <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="password">
                                    Password {editingUser && '(Kosongkan jika tidak diubah)'}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 8 karakter'}
                                    className={errors.password ? 'border-red-500' : ''}
                                />
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="Ulangi password"
                                    className={errors.password_confirmation ? 'border-red-500' : ''}
                                />
                                {errors.password_confirmation && (
                                    <p className="mt-1 text-sm text-red-500">{errors.password_confirmation}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={data.role}
                                    onValueChange={(value) => {
                                        setData('role', value);
                                        // Auto-clear outlet if role is admin
                                        if (value === 'admin') {
                                            setData({...data, role: value, id_outlet: ''});
                                        }
                                    }}
                                >
                                    <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.name}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="mt-1 text-sm text-red-500">{errors.role}</p>
                                )}
                            </div>

                            {/* Outlet Assignment dengan Logic */}
                            <div>
                                <Label htmlFor="id_outlet" className="flex items-center gap-2">
                                    Outlet Assignment
                                    {isKasirRole && (
                                        <Badge variant="destructive" className="text-xs">
                                            WAJIB
                                        </Badge>
                                    )}
                                </Label>
                                <Select
                                    value={data.id_outlet}
                                    onValueChange={(value) => setData('id_outlet', value)}
                                    disabled={data.role === 'admin'} // Disabled untuk Admin
                                >
                                    <SelectTrigger className={errors.id_outlet ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={
                                            data.role === 'admin' 
                                                ? 'Admin tidak terikat outlet (Global)' 
                                                : isKasirRole 
                                                    ? 'Pilih Outlet (WAJIB)'
                                                    : 'Pilih Outlet (Opsional)'
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tidak ada (Global)</SelectItem>
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
                                
                                {/* Helper Text */}
                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                    {data.role === 'kasir' && (
                                        <div className="flex items-start gap-2 text-red-600">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <p>Kasir WAJIB ditugaskan ke outlet tertentu</p>
                                        </div>
                                    )}
                                    {data.role === 'admin' && (
                                        <div className="flex items-start gap-2 text-blue-600">
                                            <Store className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <p>Admin memiliki akses global ke semua outlet</p>
                                        </div>
                                    )}
                                    {data.role === 'owner' && (
                                        <p>Owner bisa ditugaskan ke outlet spesifik atau dibiarkan global</p>
                                    )}
                                </div>
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