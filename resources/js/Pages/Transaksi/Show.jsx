import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Separator } from '@/Components/ui/separator';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { toast } from 'sonner';
import {
    ArrowLeft, Printer, Package, MapPin, Gift, CreditCard,
    Calendar, User, Store, DollarSign, Truck, Check, AlertCircle,
    Crown, Clock, CheckCircle, XCircle, Tag, Receipt, TrendingUp
} from 'lucide-react';

export default function TransaksiShow({ transaksi, allowedNextStatuses, isDelivery, flash }) {
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedAmount, setSelectedAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    // Show flash messages
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Format currency
    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const configs = {
            'baru': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', icon: AlertCircle, label: '🆕 Baru' },
            'proses': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: Clock, label: '⚙️ Proses' },
            'selesai': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle, label: '✅ Selesai' },
            'diambil': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200', icon: CheckCircle, label: '📦 Diambil' },
            'dikirim': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200', icon: Truck, label: '🚚 Dikirim' },
            'diterima': { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200', icon: CheckCircle, label: '✅ Diterima' },
            'batal': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: XCircle, label: '❌ Batal' },
        };
        const config = configs[status] || configs.baru;
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold`}>
                <Icon className="h-4 w-4" />
                {config.label}
            </Badge>
        );
    };

    // Handle status update
    const handleUpdateStatus = () => {
        if (!selectedStatus) {
            toast.error('Pilih status terlebih dahulu');
            return;
        }

        setProcessing(true);
        router.put(
            route('transaksi.update-status', transaksi.id),
            { status: selectedStatus },
            {
                onSuccess: () => {
                    toast.success('Status berhasil diupdate');
                    setShowStatusDialog(false);
                    setSelectedStatus('');
                },
                onError: (errors) => {
                    toast.error(errors.status || 'Gagal update status');
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    // Handle payment update
    const handleUpdatePayment = () => {
        if (!selectedPayment) {
            toast.error('Pilih status pembayaran terlebih dahulu');
            return;
        }

        setProcessing(true);
        router.put(
            route('transaksi.update-payment', transaksi.id),
            route('transaksi.update-payment', transaksi.id),
            {
                dibayar: selectedPayment,
                jumlah_bayar: selectedAmount
            },
            {
                onSuccess: () => {
                    toast.success('Status pembayaran berhasil diupdate');
                    setShowPaymentDialog(false);
                    setSelectedPayment('');
                },
                onError: (errors) => {
                    toast.error(errors.dibayar || 'Gagal update pembayaran');
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    // Calculate subtotal items
    const subtotalItems = transaksi.detail_transaksis?.reduce((sum, detail) =>
        sum + (parseFloat(detail.qty) * parseFloat(detail.paket?.harga || 0)), 0
    ) || 0;

    // Parse discount detail safely
    const diskonDetail = (() => {
        try {
            if (!transaksi.diskon_detail) return null;
            if (typeof transaksi.diskon_detail === 'object') return transaksi.diskon_detail;
            return JSON.parse(transaksi.diskon_detail);
        } catch (error) {
            console.error('Failed to parse diskon_detail:', error);
            return null;
        }
    })();

    // Check if payment is already paid
    const isAlreadyPaid = transaksi.dibayar === 'dibayar';

    // Separate promo discounts from points
    const promoDiscounts = diskonDetail?.filter(d => d.type === 'promo') || [];
    const pointsDiscount = diskonDetail?.find(d => d.type === 'points');

    return (
        <AuthenticatedLayout>
            <Head title={`Detail Transaksi - ${transaksi.kode_invoice}`} />

            <div className="py-6 print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* ══════════════════ HEADER ══════════════════ */}
                    <div className="mb-6 print:hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Left: Back Button + Title */}
                            <div className="flex items-start gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit(route('transaksi.index'))}
                                    className="shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Kembali
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Receipt className="h-6 w-6 text-blue-600" />
                                        {transaksi.kode_invoice}
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Dibuat {formatDate(transaksi.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Print Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.print()}
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            {getStatusBadge(transaksi.status)}

                            <Badge className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold ${isAlreadyPaid
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                }`}>
                                <DollarSign className="h-4 w-4" />
                                {isAlreadyPaid ? '💰 Lunas' : '⏳ Belum Bayar'}
                            </Badge>

                            {isDelivery ? (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold">
                                    <Truck className="h-4 w-4" />
                                    🚚 Delivery
                                </Badge>
                            ) : (
                                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold">
                                    <Package className="h-4 w-4" />
                                    📦 Pickup
                                </Badge>
                            )}

                            {transaksi.customer?.is_member && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold">
                                    <Crown className="h-4 w-4" />
                                    👑 Member
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════ MAIN CONTENT ══════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ────────────── LEFT COLUMN (2/3) ────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* ═══ INFORMASI UMUM ═══ */}
                            <Card>
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Store className="h-5 w-5 text-blue-600" />
                                        Informasi Umum
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Outlet
                                                </p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <Store className="h-4 w-4 text-blue-600" />
                                                    {transaksi.outlet?.nama || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Customer
                                                </p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                    {transaksi.customer?.nama || '-'}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                    📱 {transaksi.customer?.no_hp || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Kasir
                                                </p>
                                                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                                    {transaksi.user?.nama || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Tanggal Masuk
                                                </p>
                                                <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-green-600" />
                                                    {formatDate(transaksi.tgl)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Batas Waktu
                                                </p>
                                                <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-orange-600" />
                                                    {formatDate(transaksi.batas_waktu)}
                                                </p>
                                            </div>
                                            {transaksi.tgl_bayar && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                        Tanggal Bayar
                                                    </p>
                                                    <p className="text-base font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                                        <Check className="h-4 w-4" />
                                                        {formatDate(transaksi.tgl_bayar)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ═══ DETAIL PAKET ═══ */}
                            <Card>
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Package className="h-5 w-5 text-purple-600" />
                                        Detail Paket Layanan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Paket
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Jenis
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Qty
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Harga
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Subtotal
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {transaksi.detail_transaksis?.map((detail, index) => {
                                                    const qty = parseFloat(detail.qty) || 0;
                                                    const harga = parseFloat(detail.paket?.harga || 0);
                                                    const subtotal = qty * harga;

                                                    return (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="px-4 py-4">
                                                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                                    {detail.paket?.nama_paket || '⚠️ Paket Dihapus'}
                                                                </p>
                                                                {detail.keterangan && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                                                        {detail.keterangan}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                                {detail.paket?.package_type?.nama || '-'}
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                {qty} {detail.paket?.satuan || 'kg'}
                                                            </td>
                                                            <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                                                                {formatRupiah(harga)}
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                                                {formatRupiah(subtotal)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">
                                                        Subtotal Items:
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400 text-lg">
                                                        {formatRupiah(subtotalItems)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ═══ INFORMASI PENGIRIMAN (IF DELIVERY) ═══ */}
                            {isDelivery && (transaksi.alamat_lengkap || transaksi.distance_km > 0) && (
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Truck className="h-5 w-5 text-orange-600" />
                                            Informasi Pengiriman
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        {transaksi.alamat_lengkap && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                                    <MapPin className="h-3 w-3 inline mr-1" />
                                                    Alamat Pengiriman
                                                </p>
                                                <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    {transaksi.alamat_lengkap}
                                                </p>
                                            </div>
                                        )}

                                        {transaksi.catatan_lokasi && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                                    📍 Patokan / Catatan
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                                                    {transaksi.catatan_lokasi}
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jarak Tempuh</p>
                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {transaksi.distance_km || 0} <span className="text-sm">km</span>
                                                </p>
                                            </div>
                                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ongkos Kirim</p>
                                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                    {formatRupiah(transaksi.shipping_cost || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* ────────────── RIGHT COLUMN (1/3) ────────────── */}
                        <div className="space-y-6">

                            {/* ═══ RINCIAN BIAYA ═══ */}
                            <Card className="border-2 border-green-200 dark:border-green-900">
                                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <DollarSign className="h-5 w-5 text-green-600" />
                                        Rincian Biaya
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-3">
                                    {/* Subtotal Items */}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Subtotal Items</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatRupiah(subtotalItems)}
                                        </span>
                                    </div>

                                    {/* Biaya Tambahan (Surcharge tanpa shipping) */}
                                    {parseFloat(transaksi.biaya_tambahan || 0) > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Biaya Tambahan</span>
                                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                + {formatRupiah(transaksi.biaya_tambahan)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Shipping Cost */}
                                    {parseFloat(transaksi.shipping_cost || 0) > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                <Truck className="h-3 w-3" />
                                                Ongkir
                                            </span>
                                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                + {formatRupiah(transaksi.shipping_cost)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Discount */}
                                    {parseFloat(transaksi.diskon || 0) > 0 && (
                                        <>
                                            <Separator />
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <Tag className="h-3 w-3" />
                                                    Total Diskon
                                                </span>
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    - {formatRupiah(transaksi.diskon)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Tax */}
                                    {parseFloat(transaksi.pajak || 0) > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Pajak</span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                + {formatRupiah(transaksi.pajak)}
                                            </span>
                                        </div>
                                    )}

                                    <Separator className="my-4" />

                                    {/* TOTAL AKHIR */}
                                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border-2 border-green-300 dark:border-green-800">
                                        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">TOTAL</span>
                                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                                            {formatRupiah(transaksi.total_akhir)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ═══ PROMO & POIN ═══ */}
                            {((promoDiscounts && promoDiscounts.length > 0) || pointsDiscount || transaksi.customer?.is_member) && (
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Gift className="h-5 w-5 text-amber-600" />
                                            Promo & Poin
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">

                                        {/* Promo Discounts */}
                                        {promoDiscounts && promoDiscounts.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                                    <Tag className="h-3 w-3 inline mr-1" />
                                                    Promo Diterapkan ({promoDiscounts.length})
                                                </p>
                                                <div className="space-y-2">
                                                    {promoDiscounts.map((disc, idx) => (
                                                        <div key={idx} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                                        <Check className="h-3 w-3 text-green-600" />
                                                                        {disc.nama}
                                                                    </p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                                        {disc.jenis === 'percent' ? `${disc.nilai}%` : formatRupiah(disc.nilai)}
                                                                        {disc.is_member_only && (
                                                                            <Badge variant="outline" className="ml-2 border-amber-400 text-amber-600 text-[10px] px-1.5 py-0">
                                                                                <Crown className="h-2.5 w-2.5 mr-1" />
                                                                                Member
                                                                            </Badge>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                                    -{formatRupiah(disc.amount)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Points Discount */}
                                        {pointsDiscount && (
                                            <div className={promoDiscounts && promoDiscounts.length > 0 ? "pt-3 border-t border-gray-200 dark:border-gray-700" : ""}>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                                    <Gift className="h-3 w-3 inline mr-1" />
                                                    Penukaran Poin
                                                </p>
                                                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {pointsDiscount.points} Poin Ditukar
                                                            </p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                                @ Rp 500/poin
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                            -{formatRupiah(pointsDiscount.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Member Points Info */}
                                        {transaksi.customer?.is_member && (
                                            <div className={((promoDiscounts && promoDiscounts.length > 0) || pointsDiscount) ? "pt-3 border-t border-gray-200 dark:border-gray-700" : ""}>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                                    <Crown className="h-3 w-3 inline mr-1" />
                                                    Status Member
                                                </p>
                                                {isAlreadyPaid ? (
                                                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-300 dark:border-amber-800">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-amber-200 dark:bg-amber-800 rounded-full">
                                                                <TrendingUp className="h-5 w-5 text-amber-700 dark:text-amber-200" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                                                    ✨ Poin Telah Diberikan
                                                                </p>
                                                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                                                    Customer telah menerima poin untuk transaksi ini
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                                                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    ⏳ Menunggu Pembayaran
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    Poin akan diberikan setelah pembayaran lunas
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* No Promo & Not Member */}
                                        {!promoDiscounts?.length && !pointsDiscount && !transaksi.customer?.is_member && (
                                            <div className="text-center py-6">
                                                <Tag className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                    Tidak ada promo yang diterapkan
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* ═══ QUICK ACTIONS ═══ */}
                            <Card className="print:hidden border-2 border-blue-200 dark:border-blue-900">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                                    <CardTitle className="text-base font-bold">⚡ Aksi Cepat</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-3">
                                    {/* Update Status - ALWAYS show if there are allowed next statuses */}
                                    {allowedNextStatuses && allowedNextStatuses.length > 0 && (
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                            onClick={() => setShowStatusDialog(true)}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Update Status
                                        </Button>
                                    )}

                                    {/* Update Pembayaran - ONLY show if NOT already paid */}
                                    {!isAlreadyPaid && (
                                        <Button
                                            className="w-full border-2 border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/20 font-semibold"
                                            variant="outline"
                                            onClick={() => setShowPaymentDialog(true)}
                                        >
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            Update Pembayaran
                                        </Button>
                                    )}

                                    {/* Info if already paid */}
                                    {isAlreadyPaid && (
                                        <Alert className="border-green-300 bg-green-50 dark:bg-green-900/10">
                                            <Check className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                                                ✅ Pembayaran sudah lunas
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Info if no actions available */}
                                    {(!allowedNextStatuses || allowedNextStatuses.length === 0) && isAlreadyPaid && (
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-sm">
                                                Transaksi dalam status final. Tidak ada aksi yang tersedia.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════ THERMAL RECEIPT (PRINT ONLY) ══════════════════ */}
            <div className="hidden print:block font-mono text-black bg-white p-2" style={{ maxWidth: '80mm', margin: '0 auto' }}>
                <div className="text-center mb-4">
                    <p className="font-bold text-xl leading-tight">PURECLEAN LAUNDRY</p>
                    <p className="text-xs mt-1">{transaksi.outlet?.alamat || 'Alamat Outlet'}</p>
                </div>

                <div className="mb-2 pb-2 border-b border-black border-dashed">
                    <p className="text-sm font-bold">{transaksi.customer?.nama || 'Guest'}</p>
                    <p className="text-xs">{transaksi.customer?.no_hp}</p>
                </div>

                <div className="flex justify-between mb-2 text-xs">
                    <div className="text-left">
                        <p>Outlet: {transaksi.outlet?.nama}</p>
                        <p className="font-bold">{transaksi.kode_invoice}</p>
                    </div>
                    <div className="text-right">
                        <p>{formatDate(new Date())}</p>
                    </div>
                </div>

                <table className="w-full text-xs mb-4">
                    <thead>
                        <tr className="border-b border-black border-dashed">
                            <th className="text-left py-1">Item</th>
                            <th className="text-center py-1">Qty</th>
                            <th className="text-right py-1">Hrg</th>
                            <th className="text-right py-1">Ttl</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaksi.detail_transaksis?.map((detail, idx) => (
                            <tr key={idx}>
                                <td className="pt-1 pr-1">{detail.paket?.nama_paket}</td>
                                <td className="text-center pt-1">{parseFloat(detail.qty)} {detail.paket?.satuan || 'kg'}</td>
                                <td className="text-right pt-1">{formatRupiah(detail.paket?.harga).replace('Rp', '').replace(',00', '')}</td>
                                <td className="text-right pt-1">{formatRupiah(detail.qty * detail.paket?.harga).replace('Rp', '').replace(',00', '')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-black border-dashed pt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatRupiah(subtotalItems)}</span>
                    </div>
                    {parseFloat(transaksi.biaya_tambahan) > 0 && (
                        <div className="flex justify-between">
                            <span>Biaya Tambahan</span>
                            <span>{formatRupiah(transaksi.biaya_tambahan)}</span>
                        </div>
                    )}
                    {parseFloat(transaksi.shipping_cost) > 0 && (
                        <div className="flex justify-between">
                            <span>Ongkir</span>
                            <span>{formatRupiah(transaksi.shipping_cost)}</span>
                        </div>
                    )}
                    {parseFloat(transaksi.diskon) > 0 && (
                        <div className="flex justify-between">
                            <span>Diskon</span>
                            <span>-{formatRupiah(transaksi.diskon)}</span>
                        </div>
                    )}
                    {parseFloat(transaksi.pajak) > 0 && (
                        <div className="flex justify-between">
                            <span>Pajak</span>
                            <span>{formatRupiah(transaksi.pajak)}</span>
                        </div>
                    )}

                    <div className="flex justify-between font-bold text-sm my-1 pt-1 border-t border-black border-dashed">
                        <span>TOTAL</span>
                        <span>{formatRupiah(transaksi.total_akhir)}</span>
                    </div>
                </div>

                <div className="mt-4 pt-2 border-t border-black border-dashed space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Bayar</span>
                        <span>{formatRupiah(transaksi.total_bayar || selectedAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Kembalian</span>
                        <span>{formatRupiah(transaksi.kembalian || (selectedAmount ? selectedAmount - transaksi.total_akhir : 0))}</span>
                    </div>
                </div>

                <div className="text-center mt-6 text-xs">
                    <p className="font-bold">TERIMA KASIH</p>
                    <p>Cucian bersih, hatipun senang!</p>
                </div>
            </div>

            {/* ══════════════════ STATUS UPDATE DIALOG ══════════════════ */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                            Update Status Transaksi
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status Saat Ini:
                            </p>
                            {getStatusBadge(transaksi.status)}
                        </div>

                        <Separator />

                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                                Pilih Status Baru: *
                            </label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="-- Pilih Status --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedNextStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                💡 Sistem hanya menampilkan status yang valid untuk transisi
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowStatusDialog(false);
                                setSelectedStatus('');
                            }}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleUpdateStatus}
                            disabled={processing || !selectedStatus}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {processing ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Simpan
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════ PAYMENT UPDATE DIALOG ══════════════════ */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            Update Status Pembayaran
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status Saat Ini:
                            </p>
                            <Badge className={`${isAlreadyPaid
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                } px-3 py-1.5`}>
                                {isAlreadyPaid ? '💰 Lunas' : '⏳ Belum Dibayar'}
                            </Badge>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tagihan:</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {formatRupiah(transaksi.total_akhir)}
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                                Pilih Status Pembayaran: *
                            </label>
                            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="-- Pilih Status --" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="belum_dibayar">⏳ Belum Dibayar</SelectItem>
                                    <SelectItem value="dibayar">💰 Lunas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedPayment === 'dibayar' && (
                            <div className="my-4">
                                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                                    Jumlah Uang Diterima: *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                        placeholder="0"
                                        value={selectedAmount}
                                        onChange={(e) => setSelectedAmount(e.target.value)}
                                    />
                                </div>
                                {selectedAmount && (
                                    <div className="mt-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                        <p className="text-sm text-gray-500">Kembalian:</p>
                                        <p className={`font-bold ${parseFloat(selectedAmount) >= parseFloat(transaksi.total_akhir) ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatRupiah(Math.max(0, parseFloat(selectedAmount) - parseFloat(transaksi.total_akhir)))}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedPayment === 'dibayar' && transaksi.customer?.is_member && (
                            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
                                <TrendingUp className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                                    ✨ Customer akan mendapat poin setelah konfirmasi pembayaran
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPaymentDialog(false);
                                setSelectedPayment('');
                            }}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleUpdatePayment}
                            disabled={processing || !selectedPayment}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Konfirmasi
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}