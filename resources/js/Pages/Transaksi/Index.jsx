import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { toast } from 'sonner';
import { 
    Plus, Search, FileText, Store, Calendar, Eye, Trash2, 
    DollarSign, CreditCard, Clock, CheckCircle, AlertCircle
} from 'lucide-react';

export default function TransaksiIndex({ transaksis, filters, scoped_to_outlet, outlet_name, flash }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');
    const [paymentFilter, setPaymentFilter] = useState(filters.payment_filter || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('transaksi.index'), {
            search: searchTerm,
            status_filter: statusFilter,
            payment_filter: paymentFilter,
            date_from: dateFrom,
            date_to: dateTo,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (transaksi) => {
        if (transaksi.status !== 'baru' || transaksi.dibayar === 'dibayar') {
            toast.error('Hanya transaksi baru yang belum dibayar yang dapat dihapus!');
            return;
        }

        if (confirm(`Yakin ingin menghapus transaksi "${transaksi.kode_invoice}"?`)) {
            router.delete(route('transaksi.destroy', transaksi.id));
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            baru: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: AlertCircle },
            proses: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
            selesai: { className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
            diambil: { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: CheckCircle },
        };
        const config = variants[status] || variants.baru;
        const Icon = config.icon;
        
        return (
            <Badge variant="outline" className={`flex items-center gap-1 w-fit ${config.className}`}>
                <Icon className="h-3 w-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getPaymentBadge = (dibayar) => {
        return dibayar === 'dibayar' ? (
            <Badge className="bg-green-600 flex items-center gap-1 w-fit">
                <DollarSign className="h-3 w-3" />
                Lunas
            </Badge>
        ) : (
            <Badge variant="outline" className="border-red-500 text-red-600 flex items-center gap-1 w-fit">
                <CreditCard className="h-3 w-3" />
                Belum Bayar
            </Badge>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6" />
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                                Manajemen Transaksi
                            </h2>
                            {scoped_to_outlet && (
                                <p className="text-sm text-gray-500">Outlet: {outlet_name}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total: {transaksis.total} transaksi
                    </div>
                </div>
            }
        >
            <Head title="Transaksi" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            {/* Scope Info Banner */}
                            {scoped_to_outlet && (
                                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                    <div className="flex items-center gap-2">
                                        <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            <span className="font-semibold">Data Scope: </span>
                                            Menampilkan transaksi khusus outlet <span className="font-semibold">{outlet_name}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="mb-6 space-y-4">
                                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                                    {/* Search & Date */}
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            placeholder="Cari invoice atau nama customer..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button type="submit" variant="outline" size="icon">
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Filters Row */}
                                    <div className="flex flex-wrap gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Filter Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Status</SelectItem>
                                                <SelectItem value="baru">Baru</SelectItem>
                                                <SelectItem value="proses">Proses</SelectItem>
                                                <SelectItem value="selesai">Selesai</SelectItem>
                                                <SelectItem value="diambil">Diambil</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Filter Pembayaran" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Pembayaran</SelectItem>
                                                <SelectItem value="dibayar">Lunas</SelectItem>
                                                <SelectItem value="belum_dibayar">Belum Bayar</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <Input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="w-[150px]"
                                            />
                                            <span className="text-sm text-gray-500">s/d</span>
                                            <Input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="w-[150px]"
                                            />
                                        </div>

                                        <Button type="submit">
                                            Terapkan Filter
                                        </Button>

                                        <Link href={route('transaksi.create')} className="ml-auto">
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Transaksi Baru
                                            </Button>
                                        </Link>
                                    </div>
                                </form>
                            </div>

                            {/* Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            {!scoped_to_outlet && <TableHead>Outlet</TableHead>}
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-center">Pembayaran</TableHead>
                                            <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transaksis.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={scoped_to_outlet ? 7 : 8} className="text-center text-muted-foreground py-8">
                                                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p>Tidak ada transaksi</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transaksis.data.map((transaksi, index) => (
                                                <TableRow key={transaksi.id}>
                                                    <TableCell>{transaksis.from + index}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-semibold text-sm">
                                                                {transaksi.kode_invoice}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {formatDate(transaksi.tgl)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium text-sm">
                                                                {transaksi.customer.nama}
                                                                {transaksi.customer.is_member && (
                                                                    <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-600">
                                                                        Member
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {transaksi.customer.no_hp}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {!scoped_to_outlet && (
                                                        <TableCell className="text-sm">
                                                            {transaksi.outlet.nama}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-right font-semibold text-green-600">
                                                        {formatRupiah(transaksi.total_akhir)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(transaksi.status)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getPaymentBadge(transaksi.dibayar)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => router.visit(route('transaksi.show', transaksi.id))}
                                                                title="Lihat Detail"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {transaksi.status === 'baru' && transaksi.dibayar === 'belum_dibayar' && (
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(transaksi)}
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {transaksis.links.length > 3 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {transaksis.links.map((link, index) => (
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
        </AuthenticatedLayout>
    );
}