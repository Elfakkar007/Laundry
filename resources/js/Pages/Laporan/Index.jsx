import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
    Calendar,
    TrendingUp,
    CreditCard,
    Users,
    Filter,
    FileSpreadsheet,
    Download,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// Helper to format currency
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

// Helper for date formatting
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Status badge component
const StatusBadge = ({ status }) => {
    const statusConfig = {
        'baru': { label: 'Baru', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
        'proses': { label: 'Proses', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
        'selesai': { label: 'Selesai', className: 'bg-green-100 text-green-800 hover:bg-green-200' },
        'diambil': { label: 'Diambil', className: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
        'dikirim': { label: 'Dikirim', className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' },
        'diterima': { label: 'Diterima', className: 'bg-teal-100 text-teal-800 hover:bg-teal-200' },
        'batal': { label: 'Batal', className: 'bg-red-100 text-red-800 hover:bg-red-200' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
};

// Payment badge component
const PaymentBadge = ({ dibayar }) => {
    if (dibayar === 'dibayar') {
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Lunas</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Belum Lunas</Badge>;
};

export default function Index({ auth, filters, summary, chart_data, transactions, outlets, is_global }) {
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [outletId, setOutletId] = useState(filters.outlet_id || '');

    // Handle filter changes
    const handleFilter = () => {
        router.get(route('laporan.index'), {
            date_from: dateFrom,
            date_to: dateTo,
            outlet_id: outletId === 'all' ? '' : outletId,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle Excel export
    const handleExport = () => {
        window.location.href = route('laporan.export', {
            date_from: dateFrom,
            date_to: dateTo,
            outlet_id: outletId === 'all' ? '' : outletId,
        });
    };

    // Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return formatRupiah(context.raw);
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return (value / 1000) + 'k';
                    }
                }
            }
        }
    };

    // Chart Data Construction
    const barChartData = {
        labels: chart_data.map(item => item.date),
        datasets: [
            {
                label: 'Pendapatan',
                data: chart_data.map(item => item.revenue),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 6,
            },
        ],
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Laporan & Analitik</h2>}
        >
            <Head title="Laporan Laundry" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* ══════════════════ FILTER SECTION ══════════════════ */}
                    <Card className="border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/4">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Dari Tanggal
                                    </label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="w-full md:w-1/4">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Sampai Tanggal
                                    </label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Outlet Filter - For Admin/Owner */}
                                {is_global && (
                                    <div className="w-full md:w-1/4">
                                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">Outlet</label>
                                        <Select value={outletId} onValueChange={setOutletId}>
                                            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                                <SelectValue placeholder="Semua Outlet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Outlet</SelectItem>
                                                {outlets.map((outlet) => (
                                                    <SelectItem key={outlet.id} value={outlet.id.toString()}>
                                                        {outlet.nama}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="w-full md:w-auto flex gap-2">
                                    <Button onClick={handleFilter} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 shadow-md">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Terapkan Filter
                                    </Button>
                                    <Button onClick={handleExport} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 shadow-md">
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        Export Excel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ══════════════════ SUMMARY CARDS ══════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Omzet */}
                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium opacity-90">Total Omzet</p>
                                        <h3 className="text-3xl font-bold mt-2">
                                            {formatRupiah(summary.total_omzet)}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Transaksi */}
                        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium opacity-90">Total Transaksi</p>
                                        <h3 className="text-3xl font-bold mt-2">
                                            {summary.total_transaksi}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <CreditCard className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rata-rata Transaksi */}
                        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium opacity-90">Rata-rata Order</p>
                                        <h3 className="text-3xl font-bold mt-2">
                                            {formatRupiah(summary.avg_omzet)}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Users className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Pembayaran */}
                        <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium opacity-90">Status Pembayaran</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold">Lunas</span>
                                        <span className="text-2xl font-bold">{summary.total_lunas}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold">Belum Lunas</span>
                                        <span className="text-2xl font-bold">{summary.total_belum_lunas}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ══════════════════ CHART ══════════════════ */}
                    <Card className="shadow-lg border-none">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Tren Pendapatan Harian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[300px] w-full">
                                <Bar options={chartOptions} data={barChartData} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* ══════════════════ DETAILED TRANSACTIONS TABLE ══════════════════ */}
                    <Card className="shadow-lg border-none">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-gray-600" />
                                Detail Transaksi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-100 dark:bg-gray-800">
                                            <TableHead className="font-bold">No</TableHead>
                                            <TableHead className="font-bold">Kode Invoice</TableHead>
                                            <TableHead className="font-bold">Tanggal</TableHead>
                                            <TableHead className="font-bold">Customer</TableHead>
                                            <TableHead className="font-bold">Outlet</TableHead>
                                            <TableHead className="font-bold">Status</TableHead>
                                            <TableHead className="font-bold">Pembayaran</TableHead>
                                            <TableHead className="font-bold text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.length > 0 ? (
                                            transactions.data.map((trx, index) => (
                                                <TableRow key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <TableCell className="font-medium">{transactions.from + index}</TableCell>
                                                    <TableCell className="font-mono text-sm">{trx.kode_invoice}</TableCell>
                                                    <TableCell className="text-sm">{formatDate(trx.tgl)}</TableCell>
                                                    <TableCell>{trx.customer ? trx.customer.nama : '-'}</TableCell>
                                                    <TableCell>{trx.outlet ? trx.outlet.nama : '-'}</TableCell>
                                                    <TableCell><StatusBadge status={trx.status} /></TableCell>
                                                    <TableCell><PaymentBadge dibayar={trx.dibayar} /></TableCell>
                                                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                                        {formatRupiah(trx.total_akhir)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                                    Tidak ada data transaksi
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {transactions.last_page > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Menampilkan {transactions.from} - {transactions.to} dari {transactions.total} transaksi
                                    </div>
                                    <div className="flex gap-2">
                                        {transactions.links.map((link, index) => {
                                            if (link.url === null) return null;

                                            const isActive = link.active;
                                            const isPrev = link.label.includes('Previous');
                                            const isNext = link.label.includes('Next');

                                            return (
                                                <Button
                                                    key={index}
                                                    onClick={() => router.get(link.url)}
                                                    variant={isActive ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                                >
                                                    {isPrev && <ChevronLeft className="h-4 w-4" />}
                                                    {!isPrev && !isNext && link.label}
                                                    {isNext && <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
