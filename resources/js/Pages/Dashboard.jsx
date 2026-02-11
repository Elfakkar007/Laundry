import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    Users,
    Store,
    AlertCircle,
    CheckCircle,
    Clock,
    Package,
    ArrowRight,
    Plus,
} from 'lucide-react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
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
        'baru': { label: 'Baru', className: 'bg-blue-100 text-blue-800' },
        'proses': { label: 'Proses', className: 'bg-yellow-100 text-yellow-800' },
        'selesai': { label: 'Selesai', className: 'bg-green-100 text-green-800' },
        'diambil': { label: 'Diambil', className: 'bg-purple-100 text-purple-800' },
        'dikirim': { label: 'Dikirim', className: 'bg-indigo-100 text-indigo-800' },
        'diterima': { label: 'Diterima', className: 'bg-teal-100 text-teal-800' },
        'batal': { label: 'Batal', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
};

// Payment badge component
const PaymentBadge = ({ dibayar }) => {
    if (dibayar === 'dibayar') {
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Belum Lunas</Badge>;
};

// Global Dashboard Component (Admin/Owner)
function GlobalDashboard({ stats, outlet_performance, top_outlet, status_breakdown, revenue_trend, recent_transactions }) {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
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

    const chartData = {
        labels: revenue_trend.map(item => item.date),
        datasets: [
            {
                label: 'Pendapatan',
                data: revenue_trend.map(item => item.revenue),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 6,
            },
        ],
    };

    const todayTrend = stats.today_omzet - stats.yesterday_omzet;
    const monthTrend = stats.this_month_omzet - stats.last_month_omzet;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Total Omzet */}
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium opacity-90">Total Omzet</p>
                                <h3 className="text-2xl font-bold mt-2">{formatRupiah(stats.total_omzet)}</h3>
                                <div className="flex items-center gap-1 mt-2">
                                    {todayTrend >= 0 ? (
                                        <TrendingUp className="h-4 w-4" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4" />
                                    )}
                                    <span className="text-xs">vs kemarin</span>
                                </div>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <DollarSign className="h-6 w-6" />
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
                                <h3 className="text-2xl font-bold mt-2">{stats.total_transaksi}</h3>
                                <p className="text-xs mt-2 opacity-90">Hari ini: {stats.today_transaksi}</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <FileText className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Payments */}
                <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium opacity-90">Pending Payment</p>
                                <h3 className="text-2xl font-bold mt-2">{stats.pending_payments}</h3>
                                <p className="text-xs mt-2 opacity-90">Belum lunas</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Outlet */}
                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium opacity-90">Top Outlet</p>
                                <h3 className="text-lg font-bold mt-2">{top_outlet?.nama || '-'}</h3>
                                <p className="text-xs mt-2 opacity-90">{formatRupiah(top_outlet?.total_revenue || 0)}</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Store className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Members */}
                <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium opacity-90">Total Member</p>
                                <h3 className="text-2xl font-bold mt-2">{stats.total_members}</h3>
                                <p className="text-xs mt-2 opacity-90">Pelanggan aktif</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Trend Chart */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Tren Pendapatan 7 Hari Terakhir
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                        <Bar options={chartOptions} data={chartData} />
                    </div>
                </CardContent>
            </Card>

            {/* Outlet Performance Table */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-purple-600" />
                        Performa Per Outlet
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 dark:bg-gray-800">
                                <TableHead className="font-bold">Outlet</TableHead>
                                <TableHead className="font-bold text-center">Transaksi Hari Ini</TableHead>
                                <TableHead className="font-bold text-center">Total Transaksi</TableHead>
                                <TableHead className="font-bold text-right">Omzet Hari Ini</TableHead>
                                <TableHead className="font-bold text-right">Total Omzet</TableHead>
                                <TableHead className="font-bold text-center">Pending</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {outlet_performance.map((outlet) => (
                                <TableRow key={outlet.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell className="font-medium">{outlet.nama}</TableCell>
                                    <TableCell className="text-center">{outlet.today_transaksi}</TableCell>
                                    <TableCell className="text-center">{outlet.total_transaksi}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">{formatRupiah(outlet.today_revenue)}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">{formatRupiah(outlet.total_revenue)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-orange-100 text-orange-800">{outlet.pending_count}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        Transaksi Terbaru
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 dark:bg-gray-800">
                                <TableHead className="font-bold">Invoice</TableHead>
                                <TableHead className="font-bold">Tanggal</TableHead>
                                <TableHead className="font-bold">Customer</TableHead>
                                <TableHead className="font-bold">Outlet</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="font-bold">Pembayaran</TableHead>
                                <TableHead className="font-bold text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recent_transactions.map((trx) => (
                                <TableRow key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell className="font-mono text-sm">{trx.kode_invoice}</TableCell>
                                    <TableCell className="text-sm">{formatDate(trx.tgl)}</TableCell>
                                    <TableCell>{trx.customer?.nama || '-'}</TableCell>
                                    <TableCell>{trx.outlet?.nama || '-'}</TableCell>
                                    <TableCell><StatusBadge status={trx.status} /></TableCell>
                                    <TableCell><PaymentBadge dibayar={trx.dibayar} /></TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">{formatRupiah(trx.total_akhir)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// Outlet Dashboard Component (Kasir)
function OutletDashboard({ outlet_name, today_stats, status_breakdown, week_trend, needs_attention, recent_transactions, overall_stats }) {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    const chartData = {
        labels: week_trend.map(item => item.date),
        datasets: [
            {
                label: 'Transaksi',
                data: week_trend.map(item => item.count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
            },
        ],
    };

    return (
        <div className="space-y-6">
            {/* Outlet Header */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-xl text-white">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Dashboard Outlet</p>
                            <h2 className="text-3xl font-bold mt-1">{outlet_name}</h2>
                        </div>
                        <Store className="h-12 w-12 opacity-80" />
                    </div>
                </CardContent>
            </Card>

            {/* Today's Stats */}
            <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Statistik Hari Ini
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Transaksi</p>
                                    <h3 className="text-3xl font-bold mt-2">{today_stats.transaksi}</h3>
                                </div>
                                <FileText className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Omzet</p>
                                    <h3 className="text-2xl font-bold mt-2">{formatRupiah(today_stats.omzet)}</h3>
                                </div>
                                <DollarSign className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Pending</p>
                                    <h3 className="text-3xl font-bold mt-2">{today_stats.pending}</h3>
                                </div>
                                <AlertCircle className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 border-none shadow-xl text-white transform hover:scale-105 transition-transform">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Siap Diambil</p>
                                    <h3 className="text-3xl font-bold mt-2">{today_stats.ready_to_pickup}</h3>
                                </div>
                                <Package className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quick Actions */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            onClick={() => router.visit(route('transaksi.create'))}
                            className="h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg shadow-lg"
                        >
                            <Plus className="h-6 w-6 mr-2" />
                            Transaksi Baru
                        </Button>
                        <Button
                            onClick={() => router.visit(route('transaksi.index', { dibayar: 'belum' }))}
                            className="h-20 bg-orange-600 hover:bg-orange-700 text-white text-lg shadow-lg"
                        >
                            <AlertCircle className="h-6 w-6 mr-2" />
                            Lihat Pending ({today_stats.pending})
                        </Button>
                        <Button
                            onClick={() => router.visit(route('transaksi.index', { status: 'selesai' }))}
                            className="h-20 bg-teal-600 hover:bg-teal-700 text-white text-lg shadow-lg"
                        >
                            <CheckCircle className="h-6 w-6 mr-2" />
                            Siap Diambil ({today_stats.ready_to_pickup})
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Week Trend */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Tren Minggu Ini
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[250px] w-full">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </CardContent>
            </Card>

            {/* Needs Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Belum Lunas */}
                <Card className="shadow-lg border-none">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <AlertCircle className="h-5 w-5" />
                            Belum Lunas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {needs_attention.belum_lunas.length > 0 ? (
                                needs_attention.belum_lunas.map((trx) => (
                                    <div key={trx.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div>
                                            <p className="font-semibold text-sm">{trx.kode_invoice}</p>
                                            <p className="text-xs text-gray-500">{trx.customer?.nama || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-600">{formatRupiah(trx.total_akhir)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">Semua sudah lunas! 🎉</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Siap Diambil */}
                <Card className="shadow-lg border-none">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                        <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
                            <Package className="h-5 w-5" />
                            Siap Diambil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {needs_attention.siap_diambil.length > 0 ? (
                                needs_attention.siap_diambil.map((trx) => (
                                    <div key={trx.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div>
                                            <p className="font-semibold text-sm">{trx.kode_invoice}</p>
                                            <p className="text-xs text-gray-500">{trx.customer?.nama || '-'}</p>
                                        </div>
                                        <StatusBadge status={trx.status} />
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">Tidak ada cucian siap diambil</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Today */}
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        Transaksi Hari Ini
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 dark:bg-gray-800">
                                <TableHead className="font-bold">Invoice</TableHead>
                                <TableHead className="font-bold">Customer</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="font-bold">Pembayaran</TableHead>
                                <TableHead className="font-bold text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recent_transactions.length > 0 ? (
                                recent_transactions.map((trx) => (
                                    <TableRow key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <TableCell className="font-mono text-sm">{trx.kode_invoice}</TableCell>
                                        <TableCell>{trx.customer?.nama || '-'}</TableCell>
                                        <TableCell><StatusBadge status={trx.status} /></TableCell>
                                        <TableCell><PaymentBadge dibayar={trx.dibayar} /></TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">{formatRupiah(trx.total_akhir)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        Belum ada transaksi hari ini
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// Main Dashboard Component
export default function Dashboard(props) {
    const { dashboard_type } = props;

    return (
        <AuthenticatedLayout
            user={props.auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Dashboard</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {dashboard_type === 'global' ? (
                        <GlobalDashboard {...props} />
                    ) : (
                        <OutletDashboard {...props} />
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}