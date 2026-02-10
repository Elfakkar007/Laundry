import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // FIXED: use router instead of Inertia
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
    Store,
    TrendingUp,
    CreditCard,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function Index({ auth, filters, summary, chart_data, recent_transactions, outlets, user_role }) {
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

    // Auto-refresh when outlet changes (optional, or stick to button)
    // useEffect(() => {
    //     if (outletId !== filters.outlet_id) handleFilter();
    // }, [outletId]);

    // Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                display: false,
            },
            title: {
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
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
                borderRadius: 4,
            },
        ],
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Laporan & Analitik</h2>}
        >
            <Head title="Laporan Laundry" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* ══════════════════ FILTER SECTION ══════════════════ */}
                    <Card className="border-none shadow-sm bg-white dark:bg-gray-800">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/4">
                                    <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Dari Tanggal</label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-full md:w-1/4">
                                    <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Sampai Tanggal</label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full"
                                    />
                                </div>

                                {/* Outlet Filter - Only for Admin */}
                                {user_role === 'admin' && (
                                    <div className="w-full md:w-1/4">
                                        <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Outlet</label>
                                        <Select value={outletId} onValueChange={setOutletId}>
                                            <SelectTrigger>
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

                                <div className="w-full md:w-auto">
                                    <Button onClick={handleFilter} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Terapkan Filter
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ══════════════════ SUMMARY CARDS ══════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Omzet */}
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-800">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Omzet</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                            {formatRupiah(summary.total_omzet)}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-200" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Transaksi */}
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Transaksi</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                            {summary.total_transaksi}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                                        <CreditCard className="h-5 w-5 text-blue-700 dark:text-blue-200" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rata-rata Transaksi */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rata-rata Order</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                            {formatRupiah(summary.avg_omzet)}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Pembayaran */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Lunas</span>
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{summary.total_lunas}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Belum Lunas</span>
                                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{summary.total_belum_lunas}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ══════════════════ CHARTS ══════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* CHART: Revenue Trend (2/3) */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Tren Pendapatan Harian</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <Bar options={chartOptions} data={barChartData} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* RECENT TRANSACTIONS LIST (1/3) */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Transaksi Terakhir</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recent_transactions.map((trx) => (
                                        <div key={trx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                    {trx.kode_invoice}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {trx.customer ? trx.customer.nama : 'Guest'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-green-600 dark:text-green-400">
                                                    {formatRupiah(trx.total_akhir)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDate(trx.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {recent_transactions.length === 0 && (
                                        <p className="text-center text-gray-500 text-sm py-4">Tidak ada data</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
