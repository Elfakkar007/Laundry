import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { toast } from 'sonner';
import { 
    ArrowLeft, Award, Gift, TrendingUp, TrendingDown, 
    Plus, Minus, History, Phone, Mail, MapPin, Crown,
    Calendar, User, Edit
} from 'lucide-react';

export default function CustomerShow({ customer, pointHistories, pointsSettings, flash }) {
    const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        action: 'add',
        points: '',
        notes: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openAdjustDialog = () => {
        reset();
        setIsAdjustDialogOpen(true);
    };

    const closeAdjustDialog = () => {
        setIsAdjustDialogOpen(false);
        reset();
    };

    const handleAdjustSubmit = (e) => {
        e.preventDefault();
        post(route('customers.adjust-points', customer.id), {
            onSuccess: () => closeAdjustDialog(),
        });
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getHistoryBadge = (type) => {
        const variants = {
            earn: { 
                icon: TrendingUp, 
                label: 'Dapat Poin', 
                className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
            },
            redeem: { 
                icon: TrendingDown, 
                label: 'Tukar Poin', 
                className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
            },
            adjustment: { 
                icon: Edit, 
                label: 'Koreksi Admin', 
                className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
            },
        };
        return variants[type] || variants.earn;
    };

    const pointsValue = customer.poin * (pointsSettings.redeem_value || 500);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.visit(route('customers.index'))}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                {customer.is_member && <Crown className="h-5 w-5 text-yellow-500" />}
                                Detail Pelanggan
                            </h2>
                            <p className="text-sm text-gray-500">{customer.nama}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => router.visit(route('customers.index'))}>
                        Kembali
                    </Button>
                </div>
            }
        >
            <Head title={`Detail - ${customer.nama}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Customer Info Card */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Informasi Pelanggan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">{customer.no_hp}</span>
                                </div>
                                {customer.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm">{customer.email}</span>
                                    </div>
                                )}
                                {customer.alamat && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <span className="text-sm">{customer.alamat}</span>
                                    </div>
                                )}
                                <div className="pt-2">
                                    {customer.is_member ? (
                                        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600">
                                            <Crown className="h-3 w-3 mr-1" />
                                            Member Aktif
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Pelanggan Reguler</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Points Summary */}
                        {pointsSettings.enabled && (
                            <Card className="border-2 border-amber-200 dark:border-amber-900">
                                <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10">
                                    <CardTitle className="flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-amber-600" />
                                        Saldo Poin
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-3">
                                        <div>
                                            <div className="text-4xl font-bold text-amber-600">
                                                {customer.poin.toLocaleString('id-ID')}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">Poin Tersedia</p>
                                        </div>
                                        
                                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Nilai Tukar</p>
                                            <p className="text-lg font-semibold text-green-600">
                                                {formatRupiah(pointsValue)}
                                            </p>
                                        </div>

                                        <Button 
                                            onClick={openAdjustDialog} 
                                            className="w-full"
                                            variant="outline"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Koreksi Poin
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Points History */}
                    {pointsSettings.enabled && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Riwayat Poin
                                </CardTitle>
                                <CardDescription>
                                    Catatan perolehan dan penggunaan poin
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pointHistories.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p>Belum ada riwayat poin</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead>Tipe</TableHead>
                                                    <TableHead className="text-right">Poin</TableHead>
                                                    <TableHead>Keterangan</TableHead>
                                                    <TableHead>Oleh</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pointHistories.map((history) => {
                                                    const badgeInfo = getHistoryBadge(history.type);
                                                    const Icon = badgeInfo.icon;
                                                    
                                                    return (
                                                        <TableRow key={history.id}>
                                                            <TableCell className="text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                                    {formatDate(history.created_at)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={badgeInfo.className}>
                                                                    <Icon className="h-3 w-3 mr-1" />
                                                                    {badgeInfo.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`font-semibold ${
                                                                    history.points > 0 ? 'text-green-600' : 'text-red-600'
                                                                }`}>
                                                                    {history.points > 0 ? '+' : ''}{history.points}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-600">
                                                                {history.notes || '-'}
                                                                {history.transaction_amount && (
                                                                    <span className="text-xs text-gray-400 block">
                                                                        Belanja: {formatRupiah(history.transaction_amount)}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                {history.created_by ? history.created_by.nama : 'System'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Adjust Points Dialog */}
            <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Koreksi Poin Manual
                        </DialogTitle>
                        <DialogDescription>
                            Tambah atau kurangi poin pelanggan secara manual
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleAdjustSubmit}>
                        <div className="space-y-4">
                            {/* Current Balance Info */}
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Poin Saat Ini</p>
                                <p className="text-2xl font-bold text-amber-600">{customer.poin}</p>
                            </div>

                            {/* Action Selection */}
                            <div>
                                <Label htmlFor="action">Aksi *</Label>
                                <Select
                                    value={data.action}
                                    onValueChange={(value) => setData('action', value)}
                                >
                                    <SelectTrigger className={errors.action ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih Aksi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add">
                                            <div className="flex items-center gap-2">
                                                <Plus className="h-4 w-4 text-green-600" />
                                                Tambah Poin (+)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="subtract">
                                            <div className="flex items-center gap-2">
                                                <Minus className="h-4 w-4 text-red-600" />
                                                Kurangi Poin (-)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.action && (
                                    <p className="mt-1 text-sm text-red-500">{errors.action}</p>
                                )}
                            </div>

                            {/* Points Amount */}
                            <div>
                                <Label htmlFor="points">Jumlah Poin *</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    min="1"
                                    value={data.points}
                                    onChange={(e) => setData('points', e.target.value)}
                                    placeholder="Masukkan jumlah poin"
                                    className={errors.points ? 'border-red-500' : ''}
                                />
                                {errors.points && (
                                    <p className="mt-1 text-sm text-red-500">{errors.points}</p>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <Label htmlFor="notes">Catatan/Alasan *</Label>
                                <Input
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Contoh: Kompensasi komplain, hadiah ulang tahun, dll"
                                    className={errors.notes ? 'border-red-500' : ''}
                                />
                                {errors.notes && (
                                    <p className="mt-1 text-sm text-red-500">{errors.notes}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Catatan wajib diisi untuk audit trail
                                </p>
                            </div>

                            {/* Preview */}
                            {data.points && (
                                <div className="p-3 border-2 border-dashed rounded-lg">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Preview:</p>
                                    <p className="text-sm">
                                        <span className="font-semibold">{customer.poin}</span>
                                        <span className="mx-2">→</span>
                                        <span className={`font-semibold ${
                                            data.action === 'add' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {data.action === 'add' 
                                                ? customer.poin + parseInt(data.points || 0)
                                                : Math.max(0, customer.poin - parseInt(data.points || 0))
                                            }
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={closeAdjustDialog}>
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