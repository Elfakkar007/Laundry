import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Separator } from '@/Components/ui/separator';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { toast } from 'sonner';
import {
    ArrowLeft, Printer, Package, MapPin, Gift, CreditCard,
    Calendar, User, Store, DollarSign, Truck, Check, AlertCircle,
    Crown, Clock, CheckCircle, XCircle, Tag, Receipt, TrendingUp, FileText
} from 'lucide-react';

export default function TransaksiShow({ transaksi, allowedNextStatuses, isDelivery, flash }) {
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedAmount, setSelectedAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true);
    const [printType, setPrintType] = useState('thermal'); // 'thermal' or 'a4'

    // Show flash messages
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);

        // Auto-print if coming from creation
        if (flash?.print_receipt) {
            toast.dismiss();
            setTimeout(() => window.print(), 1000);
        }
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

        // Validate amount if paying
        if (selectedPayment === 'dibayar') {
            if (!selectedAmount) {
                toast.error('Masukkan jumlah uang diterima');
                return;
            }
            if (parseFloat(selectedAmount) < parseFloat(transaksi.total_akhir)) {
                toast.error('Jumlah pembayaran kurang dari total tagihan');
                return;
            }
        }

        setProcessing(true);
        router.put(
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

                    // Trigger auto-print if enabled and paid
                    if (autoPrint && selectedPayment === 'dibayar') {
                        toast.dismiss();
                        setPrintType('thermal');
                        setTimeout(() => window.print(), 500);
                    }
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

            <div className={`py-6 bg-gray-50 dark:bg-gray-900 min-h-screen print:bg-white print:py-0 ${printType === 'thermal' ? 'print-thermal-session' : 'print-a4-session'}`}>

                {/* ══════════════════ WEB VIEW (SCREEN ONLY) ══════════════════ */}
                <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* PAGE HEADER */}
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            {/* Left: Back Button */}
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
                            </div>

                            {/* Right: Print Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        toast.dismiss();
                                        setPrintType('thermal');
                                        setTimeout(() => window.print(), 500);
                                    }}
                                    className="bg-gray-50 dark:bg-gray-800"
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Cetak Struk
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        toast.dismiss();
                                        setPrintType('a4');
                                        setTimeout(() => window.print(), 500);
                                    }}
                                    className="bg-gray-50 dark:bg-gray-800"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Cetak Invoice (A4)
                                </Button>
                            </div>
                        </div>

                        {/* Status Badges Row - dengan Invoice Number di kanan */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                            {/* Left: Status Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                {getStatusBadge(transaksi.status)}

                                <Badge className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold ${isAlreadyPaid
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                    }`}>
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

                            {/* Right: Invoice Number */}
                            <div className="text-right">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-end gap-2">
                                    <Receipt className="h-6 w-6 text-blue-600" />
                                    {transaksi.kode_invoice}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════ UNIFIED MAIN CARD ══════════════════ */}
                    <Card className="mb-6">
                        <CardContent className="p-8">

                            {/* HEADER ROW: Outlet & Customer Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Outlet
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Store className="h-5 w-5 text-blue-600" />
                                            {transaksi.outlet?.nama || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Customer
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-600" />
                                            {transaksi.customer?.nama || '-'}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {transaksi.customer?.no_hp || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Kasir
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                            {transaksi.user?.nama || '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Tanggal Masuk
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-green-600" />
                                            {formatDate(transaksi.tgl)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                            Batas Waktu
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-orange-600" />
                                            {formatDate(transaksi.batas_waktu)}
                                        </p>
                                    </div>
                                    {transaksi.tgl_bayar && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
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

                            <Separator className="my-8" />

                            {/* DETAIL PAKET TABLE */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-purple-600" />
                                    Detail Paket Layanan
                                </h3>
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
                                    </table>
                                </div>
                            </div>

                            <Separator className="my-8" />

                            {/* BOTTOM SECTION: Promo & Biaya */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* LEFT: Promo & Poin */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-amber-600" />
                                        Promo & Poin
                                    </h3>

                                    {((promoDiscounts && promoDiscounts.length > 0) || pointsDiscount || transaksi.customer?.is_member) ? (
                                        <div className="space-y-4">
                                            {/* Promo Discounts */}
                                            {promoDiscounts && promoDiscounts.length > 0 && (
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
                                                                    </p>
                                                                </div>
                                                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                                    -{formatRupiah(disc.amount)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Points Discount */}
                                            {pointsDiscount && (
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
                                            )}

                                            {/* Member Status */}
                                            {transaksi.customer?.is_member && (
                                                <div>
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
                                                                        Customer telah menerima poin
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
                                                                        Poin akan diberikan setelah lunas
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* No Promo */}
                                            {!promoDiscounts?.length && !pointsDiscount && !transaksi.customer?.is_member && (
                                                <div className="text-center py-6">
                                                    <Tag className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                        Tidak ada promo yang diterapkan
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>

                                {/* RIGHT: Rincian Biaya */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-green-600" />
                                        Rincian Biaya
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Subtotal Items */}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Subtotal Items</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                {formatRupiah(subtotalItems)}
                                            </span>
                                        </div>

                                        {/* Biaya Tambahan */}
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
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Info if applicable */}
                            {isDelivery && (transaksi.alamat_lengkap || transaksi.distance_km > 0) && (
                                <>
                                    <Separator className="my-8" />
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                            <Truck className="h-5 w-5 text-orange-600" />
                                            Informasi Pengiriman
                                        </h3>
                                        <div className="space-y-4">
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
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* ══════════════════ QUICK ACTIONS (OUTSIDE MAIN CARD) ══════════════════ */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 dark:border-blue-900 p-6">
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                            ⚡ Aksi Cepat
                        </h3>
                        <div className="space-y-3">
                            {/* Update Status */}
                            {allowedNextStatuses && allowedNextStatuses.length > 0 && (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    onClick={() => setShowStatusDialog(true)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Update Status
                                </Button>
                            )}

                            {/* Update Pembayaran */}
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
                        </div>
                    </div>
                </div>

                {/* ══════════════════ THERMAL RECEIPT (PRINT ONLY) ══════════════════ */}
                <div className={`print-thermal-container hidden ${printType === 'thermal' ? 'print:block' : ''} font-mono text-black bg-white p-4 mx-auto`} style={{ width: '80mm', maxWidth: '100%' }}>
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h2 className="font-bold text-2xl tracking-tighter uppercase mb-1">PURECLEAN</h2>
                        <p className="text-[10px] leading-tight opacity-80">{transaksi.outlet?.nama}</p>
                        <p className="text-[9px] leading-tight opacity-70 mb-2">{transaksi.outlet?.alamat}</p>
                        <p className="text-[9px] font-bold">WA: 0812-3456-7890</p>
                    </div>

                    <div className="border-t border-b border-black border-dashed py-2 mb-4 space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="font-bold">INVOICE</span>
                            <span className="font-bold">{transaksi.kode_invoice}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                            <span>Tgl: {formatDate(transaksi.tgl)}</span>
                            <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4 text-[10px]">
                        <div className="flex justify-between">
                            <span className="opacity-70 uppercase text-[8px]">Pelanggan</span>
                            <span className="font-bold">{transaksi.customer?.nama || 'GUEST'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-70 uppercase text-[8px]">Telepon</span>
                            <span>{transaksi.customer?.no_hp || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-70 uppercase text-[8px]">Kasir</span>
                            <span>{transaksi.user?.nama || '-'}</span>
                        </div>
                    </div>

                    {/* Status Watermark */}
                    <div className="text-center my-2 py-1 border-2 border-black rotate-[-2deg]">
                        <p className="font-bold text-lg uppercase tracking-widest">
                            {isAlreadyPaid ? '★ L U N A S ★' : '⚠ BELUM LUNAS'}
                        </p>
                    </div>

                    {/* Items Table */}
                    <div className="mb-4">
                        <div className="flex justify-between text-[9px] font-bold border-b border-black pb-1 mb-1">
                            <span className="w-1/2">LAYANAN</span>
                            <span className="w-1/4 text-center">QTY</span>
                            <span className="w-1/4 text-right">TOTAL</span>
                        </div>
                        {transaksi.detail_transaksis?.map((detail, idx) => (
                            <div key={idx} className="mb-2">
                                <div className="flex justify-between text-[10px]">
                                    <span className="w-1/2 leading-none">{detail.paket?.nama_paket}</span>
                                    <span className="w-1/4 text-center">{parseFloat(detail.qty)} {detail.paket?.satuan || 'kg'}</span>
                                    <span className="w-1/4 text-right">{formatRupiah(detail.qty * detail.paket?.harga).replace('Rp', '').replace(',00', '')}</span>
                                </div>
                                <p className="text-[8px] opacity-60 italic">{detail.paket?.package_type?.nama}</p>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-black border-dashed pt-2 space-y-1 text-[10px]">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatRupiah(subtotalItems)}</span>
                        </div>

                        {parseFloat(transaksi.biaya_tambahan) > 0 && (
                            <div className="flex justify-between">
                                <span>Surcharge</span>
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
                            <div className="flex justify-between text-red-600">
                                <span>Promo/Diskon</span>
                                <span>-{formatRupiah(transaksi.diskon)}</span>
                            </div>
                        )}

                        {parseFloat(transaksi.pajak) > 0 && (
                            <div className="flex justify-between">
                                <span>Pajak (PPN)</span>
                                <span>{formatRupiah(transaksi.pajak)}</span>
                            </div>
                        )}

                        <div className="flex justify-between font-bold text-base pt-1 mt-1 border-t border-black border-double">
                            <span>TOTAL</span>
                            <span>{formatRupiah(transaksi.total_akhir)}</span>
                        </div>
                    </div>

                    {/* Payment Detail if Paid */}
                    {isAlreadyPaid && (
                        <div className="mt-4 pt-2 border-t border-black border-dashed text-[10px] space-y-1">
                            <div className="flex justify-between">
                                <span>Bayar</span>
                                <span>{formatRupiah(transaksi.total_bayar || selectedAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Kembali</span>
                                <span>{formatRupiah(transaksi.kembalian || (selectedAmount ? selectedAmount - transaksi.total_akhir : 0))}</span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-8 space-y-2">
                        <p className="text-[10px] font-bold tracking-widest uppercase">TERIMA KASIH</p>
                        <p className="text-[8px] leading-tight italic">
                            Periksa kembali cucian anda.<br />
                            Komplain max 1x24 jam setelah diambil.
                        </p>
                        <div className="pt-4 opacity-30 text-[7px]">
                            Generated by PureClean System v2.1
                        </div>
                    </div>
                </div>

                {/* ══════════════════ A4 INVOICE (PRINT ONLY) ══════════════════ */}
                <div className={`print-a4-container hidden ${printType === 'a4' ? 'print:block' : ''} bg-white text-black p-8 mx-auto`} style={{ maxWidth: '210mm', fontFamily: 'Arial, sans-serif' }}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-black">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">PURECLEAN</h1>
                            <p className="text-sm font-bold opacity-80 mb-3">LAUNDRY & DRY CLEANING</p>
                            <div className="text-xs space-y-0.5 opacity-70">
                                <p>{transaksi.outlet?.nama}</p>
                                <p>{transaksi.outlet?.alamat}</p>
                                <p>WA: 0812-3456-7890</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold mb-3 uppercase">Invoice</h2>
                            <p className="text-xl font-mono font-bold mb-2">{transaksi.kode_invoice}</p>
                            <p className="text-xs opacity-70">Tanggal: {formatDate(transaksi.tgl)}</p>
                        </div>
                    </div>

                    {/* Customer & Transaction Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-bold uppercase opacity-60 mb-2">Kepada:</p>
                            <p className="font-bold text-base">{transaksi.customer?.nama || 'GUEST'}</p>
                            <p className="text-sm">{transaksi.customer?.no_hp || '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase opacity-60 mb-2">Info Transaksi:</p>
                            <p className="text-sm">Kasir: {transaksi.user?.nama || '-'}</p>
                            <p className="text-sm">Batas Waktu: {formatDate(transaksi.batas_waktu)}</p>
                            {transaksi.tgl_bayar && (
                                <p className="text-sm font-bold">Tgl Bayar: {formatDate(transaksi.tgl_bayar)}</p>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2 text-xs font-bold uppercase">Layanan</th>
                                <th className="text-left py-2 text-xs font-bold uppercase">Jenis</th>
                                <th className="text-right py-2 text-xs font-bold uppercase">Qty</th>
                                <th className="text-right py-2 text-xs font-bold uppercase">Harga</th>
                                <th className="text-right py-2 text-xs font-bold uppercase">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transaksi.detail_transaksis?.map((detail, idx) => {
                                const qty = parseFloat(detail.qty) || 0;
                                const harga = parseFloat(detail.paket?.harga || 0);
                                const subtotal = qty * harga;

                                return (
                                    <tr key={idx} className="border-b border-gray-300">
                                        <td className="py-3">
                                            <p className="font-semibold">{detail.paket?.nama_paket}</p>
                                            {detail.keterangan && (
                                                <p className="text-xs italic opacity-60">{detail.keterangan}</p>
                                            )}
                                        </td>
                                        <td className="py-3 text-sm opacity-70">{detail.paket?.package_type?.nama || '-'}</td>
                                        <td className="py-3 text-right">{qty} {detail.paket?.satuan || 'kg'}</td>
                                        <td className="py-3 text-right text-sm">{formatRupiah(harga)}</td>
                                        <td className="py-3 text-right font-bold">{formatRupiah(subtotal)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Summary */}
                    <div className="flex justify-end">
                        <div className="w-1/2 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal Items:</span>
                                <span className="font-semibold">{formatRupiah(subtotalItems)}</span>
                            </div>

                            {parseFloat(transaksi.biaya_tambahan) > 0 && (
                                <div className="flex justify-between">
                                    <span>Biaya Tambahan:</span>
                                    <span className="font-semibold">{formatRupiah(transaksi.biaya_tambahan)}</span>
                                </div>
                            )}

                            {parseFloat(transaksi.shipping_cost) > 0 && (
                                <div className="flex justify-between">
                                    <span>Ongkos Kirim:</span>
                                    <span className="font-semibold">{formatRupiah(transaksi.shipping_cost)}</span>
                                </div>
                            )}

                            {parseFloat(transaksi.diskon) > 0 && (
                                <div className="flex justify-between">
                                    <span>Total Diskon:</span>
                                    <span className="font-semibold">-{formatRupiah(transaksi.diskon)}</span>
                                </div>
                            )}

                            {parseFloat(transaksi.pajak) > 0 && (
                                <div className="flex justify-between">
                                    <span>Pajak:</span>
                                    <span className="font-semibold">{formatRupiah(transaksi.pajak)}</span>
                                </div>
                            )}

                            <div className="flex justify-between pt-3 mt-3 border-t-2 border-black">
                                <span className="text-xl font-bold uppercase">Total:</span>
                                <span className="text-2xl font-bold">{formatRupiah(transaksi.total_akhir)}</span>
                            </div>

                            {isAlreadyPaid && (
                                <>
                                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-400">
                                        <span>Dibayar:</span>
                                        <span className="font-semibold">{formatRupiah(transaksi.total_bayar || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Kembalian:</span>
                                        <span className="font-semibold">{formatRupiah(transaksi.kembalian || 0)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Payment Status Badge */}
                    <div className="mt-8 text-center">
                        <div className="inline-block px-8 py-3 border-4 border-black font-bold text-2xl uppercase tracking-widest rotate-[-2deg]">
                            {isAlreadyPaid ? '★ LUNAS ★' : '⚠ BELUM LUNAS'}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-gray-300 text-center text-xs opacity-60">
                        <p className="mb-2">Terima kasih atas kepercayaan Anda</p>
                        <p>Periksa kembali cucian Anda. Komplain maksimal 1x24 jam setelah diambil.</p>
                        <p className="mt-4 text-[10px]">Generated by PureClean System v2.1</p>
                    </div>
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
                        <DialogDescription className="sr-only">
                            Pilih status pengerjaan laundry untuk transaksi ini.
                        </DialogDescription>
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
                        <DialogDescription className="sr-only">
                            Konfirmasi pembayaran atau ubah status lunas transaksi ini.
                        </DialogDescription>
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

                        <div className="flex items-center space-x-2 pt-2 border-t mt-4">
                            <input
                                type="checkbox"
                                id="autoPrint"
                                checked={autoPrint}
                                onChange={(e) => setAutoPrint(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="autoPrint" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Printer className="h-4 w-4" />
                                Cetak struk otomatis setelah konfirmasi
                            </label>
                        </div>
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
                            disabled={
                                processing ||
                                !selectedPayment ||
                                (selectedPayment === 'dibayar' && (!selectedAmount || parseFloat(selectedAmount) < parseFloat(transaksi.total_akhir)))
                            }
                            className={`
                                ${selectedPayment === 'dibayar' && (!selectedAmount || parseFloat(selectedAmount) < parseFloat(transaksi.total_akhir))
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'}
                            `}
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