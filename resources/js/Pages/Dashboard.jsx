import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { DollarSign, FileText, Users, TrendingUp, Store, Clock, Info } from 'lucide-react';

export default function Dashboard({ stats, recent_transaksi, scoped_to_outlet, outlet_name }) {
    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const variants = {
            baru: { variant: 'outline', className: 'border-blue-500 text-blue-600' },
            proses: { variant: 'outline', className: 'border-yellow-500 text-yellow-600' },
            selesai: { variant: 'outline', className: 'border-green-500 text-green-600' },
            diambil: { variant: 'default', className: 'bg-green-600' },
        };
        return variants[status] || variants.baru;
    };

    const getPaymentBadge = (dibayar) => {
        return dibayar === 'dibayar'
            ? { variant: 'default', className: 'bg-green-600', text: 'Lunas' }
            : { variant: 'outline', className: 'border-red-500 text-red-600', text: 'Belum Bayar' };
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <span>Dashboard</span>
                    {scoped_to_outlet && (
                        <Badge variant="outline" className="flex items-center gap-2">
                            <Store className="h-3 w-3" />
                            {outlet_name}
                        </Badge>
                    )}
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Scoping Alert */}
                    <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                            <strong>Data Scope:</strong> {scoped_to_outlet
                                ? `Menampilkan data khusus outlet ${outlet_name}`
                                : 'Menampilkan data global dari seluruh outlet (Admin/Owner Mode)'}
                        </AlertDescription>
                    </Alert>

                    {/* Stats Cards */}
                    <div className="grid gap-6 md:grid-cols-3 mb-8">
                        {/* Total Pendapatan */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Pendapatan
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatRupiah(stats.total_pendapatan)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Transaksi yang sudah lunas
                                </p>
                            </CardContent>
                        </Card>

                        {/* Jumlah Transaksi */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Jumlah Transaksi
                                </CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.jumlah_transaksi}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total transaksi {scoped_to_outlet ? 'di outlet ini' : 'semua outlet'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Jumlah Member */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Jumlah Member
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.jumlah_member}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Pelanggan member aktif
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Transactions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Transaksi Terbaru
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recent_transaksi.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>Belum ada transaksi</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recent_transaksi.map((transaksi) => (
                                        <div
                                            key={transaksi.id}
                                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors dark:border-gray-700 dark:hover:border-gray-600"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-sm">
                                                        {transaksi.kode_invoice}
                                                    </p>
                                                    <Badge {...getStatusBadge(transaksi.status)}>
                                                        {transaksi.status}
                                                    </Badge>
                                                    <Badge {...getPaymentBadge(transaksi.dibayar)}>
                                                        {getPaymentBadge(transaksi.dibayar).text}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {transaksi.customer_name} • {transaksi.outlet_name}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {transaksi.tgl}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">
                                                    {formatRupiah(transaksi.total)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}