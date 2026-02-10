import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Separator } from '@/Components/ui/separator';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { toast } from 'sonner';
import {
    ArrowLeft, Printer, Edit, Package, MapPin, Gift, CreditCard,
    Calendar, User, Store, DollarSign, Truck, Check, AlertCircle, Crown
} from 'lucide-react';

export default function TransaksiShow({ transaksi, allowedNextStatuses, isDelivery, flash }) {
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [processing, setProcessing] = useState(false);

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

    // Get status badge color
    const getStatusColor = (status) => {
        const colors = {
            'baru': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'proses': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'selesai': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'diambil': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'dikirim': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'diterima': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
            'batal': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // Get payment badge color
    const getPaymentColor = (dibayar) => {
        return dibayar === 'dibayar'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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
            { dibayar: selectedPayment },
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

    // Handle print
    const handlePrint = () => {
        window.print();
    };

    // Parse diskon detail safely
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

    return (
        <AuthenticatedLayout>
            <Head title={`Detail Transaksi - ${transaksi.kode_invoice}`} />

            <div className="py-6 print:py-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6 print:hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit(route('transaksi.index'))}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Kembali
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {transaksi.kode_invoice}
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Detail Transaksi
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrint}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print
                                </Button>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-4">
                            <Badge className={getStatusColor(transaksi.status)}>
                                {transaksi.status_label || transaksi.status}
                            </Badge>
                            <Badge className={getPaymentColor(transaksi.dibayar)}>
                                {transaksi.dibayar === 'dibayar' ? '💰 Lunas' : '⏳ Belum Dibayar'}
                            </Badge>
                            {isDelivery && (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <Truck className="h-3 w-3 mr-1" />
                                    Delivery
                                </Badge>
                            )}
                            {!isDelivery && (
                                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    <Package className="h-3 w-3 mr-1" />
                                    Pickup
                                </Badge>
                            )}
                            {transaksi.customer?.is_member && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Member
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Flash Messages */}
                    {flash?.success && (
                        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/10 print:hidden">
                            <Check className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                {flash.success}
                            </AlertDescription>
                        </Alert>
                    )}

                    {flash?.error && (
                        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10 print:hidden">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800 dark:text-red-200">
                                {flash.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Informasi Umum */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Store className="h-5 w-5" />
                                        Informasi Umum
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Outlet</p>
                                            <p className="font-medium">{transaksi.outlet?.nama || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                                            <p className="font-medium">{transaksi.customer?.nama || '-'}</p>
                                            <p className="text-xs text-gray-500">{transaksi.customer?.no_hp || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Tanggal Masuk</p>
                                            <p className="font-medium">{formatDate(transaksi.tgl)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Batas Waktu</p>
                                            <p className="font-medium">{formatDate(transaksi.batas_waktu)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Kasir</p>
                                            <p className="font-medium">{transaksi.user?.name || '-'}</p>
                                        </div>
                                        {transaksi.tgl_bayar && (
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Tanggal Bayar</p>
                                                <p className="font-medium">{formatDate(transaksi.tgl_bayar)}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detail Paket */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Detail Paket
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paket</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Jenis</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Harga</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {transaksi.detail_transaksis?.map((detail, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3 text-sm">{detail.paket?.nama_paket || 'Item Deleted'}</td>
                                                        <td className="px-4 py-3 text-sm">{detail.paket?.package_type?.nama || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{detail.qty}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{formatRupiah(detail.paket?.harga || detail.harga || 0)}</td>
                                                        <td className="px-4 py-3 text-sm text-right font-medium">{formatRupiah(detail.qty * (detail.paket?.harga || detail.harga || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Shipping Info (if delivery) */}
                            {isDelivery && transaksi.alamat_lengkap && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Truck className="h-5 w-5" />
                                            Informasi Pengiriman
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Alamat Lengkap</p>
                                            <p className="text-sm">{transaksi.alamat_lengkap}</p>
                                        </div>
                                        {transaksi.catatan_lokasi && (
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Patokan / Catatan</p>
                                                <p className="text-sm italic">{transaksi.catatan_lokasi}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Jarak</p>
                                                <p className="font-medium">{transaksi.distance_km || 0} km</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Ongkir</p>
                                                <p className="font-medium">{formatRupiah(transaksi.shipping_cost)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Rincian Biaya */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Rincian Biaya
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Subtotal Items</span>
                                        <span className="font-medium">
                                            {formatRupiah(
                                                transaksi.detail_transaksis?.reduce((sum, detail) =>
                                                    sum + (detail.qty * (detail.paket?.harga || detail.harga || 0)), 0
                                                ) || 0
                                            )}
                                        </span>
                                    </div>
                                    {transaksi.biaya_tambahan > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Biaya Tambahan</span>
                                            <span className="font-medium">{formatRupiah(transaksi.biaya_tambahan)}</span>
                                        </div>
                                    )}
                                    {transaksi.shipping_cost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Ongkir</span>
                                            <span className="font-medium">{formatRupiah(transaksi.shipping_cost)}</span>
                                        </div>
                                    )}
                                    {transaksi.diskon > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                            <span>Diskon</span>
                                            <span className="font-medium">-{formatRupiah(transaksi.diskon)}</span>
                                        </div>
                                    )}
                                    {transaksi.pajak > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Pajak</span>
                                            <span className="font-medium">{formatRupiah(transaksi.pajak)}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-blue-600 dark:text-blue-400">{formatRupiah(transaksi.total_akhir)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Promo & Poin */}
                            {(diskonDetail || transaksi.diskon > 0 || transaksi.customer?.is_member) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Gift className="h-5 w-5" />
                                            Promo & Poin
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Show discount info */}
                                        {transaksi.diskon > 0 && (
                                            <div>
                                                <p className="text-sm font-medium mb-2">Diskon Diterapkan:</p>
                                                {diskonDetail?.discounts && diskonDetail.discounts.length > 0 ? (
                                                    diskonDetail.discounts.map((disc, idx) => (
                                                        <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex justify-between mb-1">
                                                            <span>• {disc.nama}</span>
                                                            <span className="text-green-600 font-medium">-{formatRupiah(disc.amount)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                                                        <span>• Diskon Manual</span>
                                                        <span className="text-green-600 font-medium">-{formatRupiah(transaksi.diskon)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Show member points info */}
                                        {transaksi.customer?.is_member && (
                                            <div className={transaksi.diskon > 0 ? "pt-2 border-t" : ""}>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status Member</p>
                                                {transaksi.dibayar === 'dibayar' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Crown className="h-4 w-4 text-amber-500" />
                                                        <p className="text-sm font-medium text-amber-600">
                                                            ✨ Poin telah diberikan untuk transaksi ini
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Crown className="h-4 w-4 text-gray-400" />
                                                        <p className="text-sm text-gray-500">
                                                            Poin akan diberikan setelah pembayaran lunas
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Show if no promo and not member */}
                                        {!transaksi.diskon && !transaksi.customer?.is_member && (
                                            <p className="text-sm text-gray-500 italic">
                                                Tidak ada promo yang diterapkan
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Quick Actions */}
                            <Card className="print:hidden">
                                <CardHeader>
                                    <CardTitle className="text-base">Aksi Cepat</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {allowedNextStatuses.length > 0 && (
                                        <Button
                                            className="w-full"
                                            onClick={() => setShowStatusDialog(true)}
                                        >
                                            Update Status
                                        </Button>
                                    )}
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => setShowPaymentDialog(true)}
                                    >
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Update Pembayaran
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Update Dialog */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Status Transaksi</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Status Saat Ini:</p>
                            <Badge className={getStatusColor(transaksi.status)}>
                                {transaksi.status_label || transaksi.status}
                            </Badge>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Pilih Status Baru:</label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedNextStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={processing}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={processing || !selectedStatus}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Update Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Status Pembayaran</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Status Saat Ini:</p>
                            <Badge className={getPaymentColor(transaksi.dibayar)}>
                                {transaksi.dibayar === 'dibayar' ? 'Lunas' : 'Belum Dibayar'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Total Tagihan:</p>
                            <p className="text-2xl font-bold text-blue-600">{formatRupiah(transaksi.total_akhir)}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Pilih Status Pembayaran:</label>
                            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="belum_dibayar">Belum Dibayar</SelectItem>
                                    <SelectItem value="dibayar">Lunas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={processing}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdatePayment} disabled={processing || !selectedPayment}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
