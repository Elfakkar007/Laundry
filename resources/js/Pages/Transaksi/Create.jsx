import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/Components/ui/dialog';
import { Separator } from '@/Components/ui/separator';
import { toast } from 'sonner';
import { 
    ArrowLeft, Plus, Trash2, Store, User, Calendar, Clock, 
    Package, CreditCard, Tag, Gift, DollarSign, Calculator,
    X, Check, Crown, AlertCircle, Receipt, TrendingUp, MapPin
} from 'lucide-react';

export default function TransaksiCreate({ 
    outlets, 
    customers, 
    pakets, 
    surcharges, 
    promos, 
    settings,
    invoiceCode,
    selectedOutletId,
    isKasir,
    userOutlet,
    userName,
    flash 
}) {
    // State Management
    const [currentOutletId, setCurrentOutletId] = useState(selectedOutletId);
    const [currentInvoiceCode, setCurrentInvoiceCode] = useState(invoiceCode);
    const [currentPakets, setCurrentPakets] = useState(pakets);
    const [loadingOutletData, setLoadingOutletData] = useState(false);

    // Customer State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);

    // Transaction Items
    const [items, setItems] = useState([]);

    // Surcharges State
    const [selectedSurcharges, setSelectedSurcharges] = useState([]);
    const [surchargeDistances, setSurchargeDistances] = useState({});

    // Promo & Points State
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [redeemPoints, setRedeemPoints] = useState(0);

    // Payment Dialog
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    // Calculation State
    const [calculation, setCalculation] = useState({
        subtotal_items: 0,
        total_surcharge: 0,
        total_dengan_surcharge: 0,
        diskon_promo: 0,
        diskon_poin: 0,
        total_diskon: 0,
        total_setelah_diskon: 0,
        pajak_amount: 0,
        total_akhir: 0,
        earned_points: 0,
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        id_outlet: currentOutletId,
        id_customer: null,
        tgl: new Date().toISOString().split('T')[0],
        batas_waktu: '',
        items: [],
        surcharges: [],
        surcharge_distances: {},
        id_promo: null,
        redeem_points: 0,
        status: 'baru',
        payment_action: 'bayar_nanti',
        jumlah_bayar: null,
    });

    // Quick Add Customer Form
    const quickAddForm = useForm({
        nama: '',
        no_hp: '',
        is_member: false,
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Handle Outlet Change (Admin Only)
    const handleOutletChange = async (outletId) => {
        if (isKasir) return;

        setLoadingOutletData(true);
        try {
            const response = await fetch(route('transaksi.outlet-data', outletId));
            const data = await response.json();

            setCurrentOutletId(outletId);
            setCurrentPakets(data.pakets);
            setCurrentInvoiceCode(data.invoiceCode);
            setItems([]);
            
            toast.success('Outlet berhasil diganti');
        } catch (error) {
            toast.error('Gagal mengambil data outlet');
        } finally {
            setLoadingOutletData(false);
        }
    };

    // Add Item
    const addItem = () => {
        setItems([...items, {
            id: Date.now(),
            id_paket: '',
            qty: 1,
            keterangan: '',
        }]);
    };

    // Remove Item
    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    // Update Item
    const updateItem = (id, field, value) => {
        setItems(items.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Toggle Surcharge
    const toggleSurcharge = (surchargeId) => {
        if (selectedSurcharges.includes(surchargeId)) {
            setSelectedSurcharges(selectedSurcharges.filter(id => id !== surchargeId));
            const newDistances = { ...surchargeDistances };
            delete newDistances[surchargeId];
            setSurchargeDistances(newDistances);
        } else {
            setSelectedSurcharges([...selectedSurcharges, surchargeId]);
        }
    };

    // Calculate Transaction Total
    useEffect(() => {
        calculateTotal();
    }, [items, selectedSurcharges, surchargeDistances, selectedPromo, redeemPoints]);

    const calculateTotal = () => {
        let subtotalItems = 0;
        items.forEach(item => {
            if (item.id_paket) {
                const paket = currentPakets.find(p => p.id === parseInt(item.id_paket));
                if (paket) {
                    subtotalItems += parseFloat(item.qty) * parseFloat(paket.harga);
                }
            }
        });

        let totalSurcharge = 0;
        selectedSurcharges.forEach(surchargeId => {
            const surcharge = surcharges.find(s => s.id === surchargeId);
            if (!surcharge) return;

            if (surcharge.min_order_total && subtotalItems >= surcharge.min_order_total) {
                return;
            }

            let amount = 0;
            switch (surcharge.calculation_type) {
                case 'percent':
                    amount = (subtotalItems * surcharge.nominal) / 100;
                    break;
                case 'distance':
                    const distance = surchargeDistances[surchargeId] || 0;
                    amount = surcharge.nominal * distance;
                    break;
                case 'fixed':
                default:
                    amount = parseFloat(surcharge.nominal);
                    break;
            }
            totalSurcharge += amount;
        });

        const totalDenganSurcharge = subtotalItems + totalSurcharge;

        let diskonPromo = 0;
        if (selectedPromo) {
            const promo = promos.find(p => p.id === selectedPromo);
            if (promo) {
                if (!promo.minimal_transaksi || totalDenganSurcharge >= promo.minimal_transaksi) {
                    if (!promo.syarat_member_only || (selectedCustomer && selectedCustomer.is_member)) {
                        if (promo.jenis === 'percent') {
                            diskonPromo = (totalDenganSurcharge * promo.diskon) / 100;
                        } else {
                            diskonPromo = Math.min(parseFloat(promo.diskon), totalDenganSurcharge);
                        }
                    }
                }
            }
        }

        let diskonPoin = 0;
        if (redeemPoints > 0 && selectedCustomer) {
            diskonPoin = redeemPoints * settings.points_redeem_value;
        }

        const totalDiskon = diskonPromo + diskonPoin;
        const totalSetelahDiskon = Math.max(0, totalDenganSurcharge - totalDiskon);

        const pajakAmount = settings.auto_apply_tax 
            ? (totalSetelahDiskon * settings.tax_rate / 100) 
            : 0;

        const totalAkhir = totalSetelahDiskon + pajakAmount;

        let earnedPoints = 0;
        if (selectedCustomer && selectedCustomer.is_member && settings.points_enabled) {
            earnedPoints = Math.floor(totalAkhir / settings.points_earn_ratio);
        }

        setCalculation({
            subtotal_items: subtotalItems,
            total_surcharge: totalSurcharge,
            total_dengan_surcharge: totalDenganSurcharge,
            diskon_promo: diskonPromo,
            diskon_poin: diskonPoin,
            total_diskon: totalDiskon,
            total_setelah_diskon: totalSetelahDiskon,
            pajak_amount: pajakAmount,
            total_akhir: totalAkhir,
            earned_points: earnedPoints,
        });
    };

    // Handle Quick Add Customer
    const handleQuickAddCustomer = (e) => {
        e.preventDefault();
        quickAddForm.post(route('customers.store'), {
            onSuccess: () => {
                toast.success('Customer berhasil ditambahkan!');
                setShowQuickAddCustomer(false);
                quickAddForm.reset();
                router.reload({ only: ['customers'] });
            },
        });
    };

    // Handle Save Later
    const handleSaveLater = () => {
        if (!validateForm()) return;

        const submissionData = {
            id_outlet: currentOutletId,
            id_customer: selectedCustomer.id,
            tgl: data.tgl,
            batas_waktu: data.batas_waktu,
            items: items.filter(item => item.id_paket).map(({ id, ...rest }) => rest),
            surcharges: selectedSurcharges,
            surcharge_distances: surchargeDistances,
            id_promo: selectedPromo,
            redeem_points: redeemPoints,
            status: data.status,
            payment_action: 'bayar_nanti',
            jumlah_bayar: null,
        };

        post(route('transaksi.store'), {
            data: submissionData
        });
    };

    // Handle Pay Now
    const handlePayNow = () => {
        if (!validateForm()) return;
        setPaymentAmount(calculation.total_akhir.toString());
        setShowPaymentDialog(true);
    };

    // Handle Payment Submit
    const handlePaymentSubmit = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount < calculation.total_akhir) {
            toast.error('Jumlah bayar kurang dari total tagihan!');
            return;
        }

        const submissionData = {
            id_outlet: currentOutletId,
            id_customer: selectedCustomer.id,
            tgl: data.tgl,
            batas_waktu: data.batas_waktu,
            items: items.filter(item => item.id_paket).map(({ id, ...rest }) => rest),
            surcharges: selectedSurcharges,
            surcharge_distances: surchargeDistances,
            id_promo: selectedPromo,
            redeem_points: redeemPoints,
            status: data.status,
            payment_action: 'bayar_lunas',
            jumlah_bayar: amount,
        };

        post(route('transaksi.store'), {
            data: submissionData
        });
    };

    // Validate Form
    const validateForm = () => {
        if (!currentOutletId) {
            toast.error('Pilih outlet terlebih dahulu!');
            return false;
        }

        if (!selectedCustomer) {
            toast.error('Pilih customer terlebih dahulu!');
            return false;
        }

        if (items.filter(item => item.id_paket).length === 0) {
            toast.error('Tambahkan minimal 1 item paket!');
            return false;
        }

        if (!data.batas_waktu) {
            toast.error('Tentukan batas waktu pengerjaan!');
            return false;
        }

        if (redeemPoints > 0 && selectedCustomer && redeemPoints > selectedCustomer.poin) {
            toast.error('Poin customer tidak mencukupi!');
            return false;
        }

        return true;
    };

    // Format Currency
    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Get Promo Eligibility
    const isPromoEligible = (promo) => {
        if (!promo) return false;
        
        if (promo.syarat_member_only && (!selectedCustomer || !selectedCustomer.is_member)) {
            return false;
        }

        if (promo.minimal_transaksi && calculation.total_dengan_surcharge < promo.minimal_transaksi) {
            return false;
        }

        return true;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.visit(route('transaksi.index'))}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                            Transaksi Baru
                        </h2>
                        <p className="text-sm text-gray-500">Buat transaksi laundry baru</p>
                    </div>
                </div>
            }
        >
            <Head title="Transaksi Baru" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Header Card - Outlet & Invoice */}
                    <Card className="border-2 border-blue-200 dark:border-blue-900">
                        <CardContent className="pt-6">
                            {isKasir ? (
                                /* KASIR VIEW - Fixed Header */
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Outlet</p>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                                    {userOutlet.nama}
                                                </p>
                                            </div>
                                        </div>
                                        <Separator orientation="vertical" className="h-10" />
                                        <div className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Kasir</p>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                                    {userName}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Invoice</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {currentInvoiceCode}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* ADMIN VIEW - Outlet Switcher */
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="outlet">Outlet *</Label>
                                        <Select 
                                            value={currentOutletId?.toString()} 
                                            onValueChange={(value) => handleOutletChange(parseInt(value))}
                                            disabled={loadingOutletData}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Outlet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {outlets.map((outlet) => (
                                                    <SelectItem key={outlet.id} value={outlet.id.toString()}>
                                                        {outlet.nama}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Data paket akan disesuaikan dengan outlet yang dipilih
                                        </p>
                                    </div>
                                    <div className="flex items-end">
                                        <div className="flex-1 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-900">
                                            <p className="text-xs text-gray-500">Invoice Code</p>
                                            <p className="text-xl font-bold text-blue-600">
                                                {currentInvoiceCode}
                                            </p>
                                            <p className="text-xs text-gray-400">Auto-generated</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN - Form Inputs */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Customer & Date Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Informasi Customer & Jadwal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Customer *</Label>
                                        <div className="flex gap-2">
                                            <Select 
                                                value={selectedCustomer?.id?.toString() || 'none'} 
                                                onValueChange={(value) => {
                                                    if (value === 'none') {
                                                        setSelectedCustomer(null);
                                                    } else {
                                                        const customer = customers.find(c => c.id === parseInt(value));
                                                        setSelectedCustomer(customer);
                                                        setRedeemPoints(0);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Pilih Customer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Pilih Customer --</SelectItem>
                                                    {customers.map((customer) => (
                                                        <SelectItem key={customer.id} value={customer.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                <span>{customer.nama}</span>
                                                                {customer.is_member && (
                                                                    <Crown className="h-3 w-3 text-yellow-500" />
                                                                )}
                                                                <span className="text-xs text-gray-500">({customer.no_hp})</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline"
                                                onClick={() => setShowQuickAddCustomer(true)}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Tambah
                                            </Button>
                                        </div>
                                        {selectedCustomer && (
                                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium">{selectedCustomer.nama}</p>
                                                        <p className="text-xs text-gray-500">{selectedCustomer.no_hp}</p>
                                                    </div>
                                                    {selectedCustomer.is_member && (
                                                        <div className="flex items-center gap-2">
                                                            <Gift className="h-4 w-4 text-amber-600" />
                                                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                                {selectedCustomer.poin} poin
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="tgl">Tanggal *</Label>
                                            <Input
                                                id="tgl"
                                                type="date"
                                                value={data.tgl}
                                                onChange={(e) => setData('tgl', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="batas_waktu">Batas Waktu Selesai *</Label>
                                            <Input
                                                id="batas_waktu"
                                                type="datetime-local"
                                                value={data.batas_waktu}
                                                onChange={(e) => setData('batas_waktu', e.target.value)}
                                            />
                                            {errors.batas_waktu && (
                                                <p className="mt-1 text-sm text-red-500">{errors.batas_waktu}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Items Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-5 w-5" />
                                            Paket Layanan
                                        </div>
                                        <Button type="button" onClick={addItem} size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Tambah
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                            <p>Belum ada paket. Klik "Tambah" untuk menambah item.</p>
                                        </div>
                                    ) : (
                                        items.map((item, index) => {
                                            const selectedPaket = currentPakets.find(p => p.id === parseInt(item.id_paket));
                                            const subtotal = selectedPaket ? parseFloat(item.qty) * parseFloat(selectedPaket.harga) : 0;

                                            return (
                                                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline">Item #{index + 1}</Badge>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="grid md:grid-cols-4 gap-3">
                                                        <div className="md:col-span-2">
                                                            <Label>Paket *</Label>
                                                            <Select
                                                                value={item.id_paket?.toString() || 'none'}
                                                                onValueChange={(value) => updateItem(item.id, 'id_paket', value === 'none' ? '' : value)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Pilih Paket" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">-- Pilih Paket --</SelectItem>
                                                                    {currentPakets.map((paket) => (
                                                                        <SelectItem key={paket.id} value={paket.id.toString()}>
                                                                            {paket.nama_paket} - {formatRupiah(paket.harga)}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label>Qty (kg) *</Label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0.01"
                                                                value={item.qty}
                                                                onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Subtotal</Label>
                                                            <div className="h-9 flex items-center px-3 bg-gray-50 dark:bg-gray-900 border rounded-md">
                                                                <span className="font-semibold text-green-600">
                                                                    {formatRupiah(subtotal)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label>Keterangan</Label>
                                                        <Input
                                                            placeholder="Contoh: Noda kopi, pewangi extra"
                                                            value={item.keterangan}
                                                            onChange={(e) => updateItem(item.id, 'keterangan', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>

                            {/* Surcharges */}
                            {surcharges.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Biaya Tambahan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {surcharges.map((surcharge) => {
                                            const isSelected = selectedSurcharges.includes(surcharge.id);
                                            const isFree = surcharge.min_order_total && 
                                                calculation.subtotal_items >= surcharge.min_order_total;

                                            return (
                                                <div key={surcharge.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSurcharge(surcharge.id)}
                                                        className="mt-1"
                                                        disabled={isFree}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{surcharge.nama}</p>
                                                            {isFree && (
                                                                <Badge className="bg-green-600">GRATIS</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {surcharge.calculation_type === 'percent' && `${surcharge.nominal}%`}
                                                            {surcharge.calculation_type === 'fixed' && formatRupiah(surcharge.nominal)}
                                                            {surcharge.calculation_type === 'distance' && `${formatRupiah(surcharge.nominal)}/km`}
                                                        </p>
                                                    </div>
                                                    {isSelected && surcharge.calculation_type === 'distance' && (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            placeholder="Jarak (km)"
                                                            value={surchargeDistances[surcharge.id] || ''}
                                                            onChange={(e) => setSurchargeDistances({
                                                                ...surchargeDistances,
                                                                [surcharge.id]: parseFloat(e.target.value) || 0
                                                            })}
                                                            className="w-32"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Promo & Points */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        Diskon & Promo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Pilih Promo</Label>
                                        <Select
                                            value={selectedPromo?.toString() || 'none'}
                                            onValueChange={(value) => setSelectedPromo(value === 'none' ? null : parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tidak ada promo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Tidak ada promo</SelectItem>
                                                {promos.map((promo) => (
                                                    <SelectItem 
                                                        key={promo.id} 
                                                        value={promo.id.toString()}
                                                        disabled={!isPromoEligible(promo)}
                                                    >
                                                        {promo.nama_promo} ({promo.jenis === 'percent' ? `${promo.diskon}%` : formatRupiah(promo.diskon)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedCustomer && selectedCustomer.is_member && selectedCustomer.poin > 0 && (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900 rounded-lg space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Gift className="h-5 w-5 text-amber-600" />
                                                <p className="font-semibold">Tukar Poin</p>
                                            </div>
                                            <div>
                                                <Label>Jumlah Poin</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={selectedCustomer.poin}
                                                    value={redeemPoints}
                                                    onChange={(e) => setRedeemPoints(parseInt(e.target.value) || 0)}
                                                />
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Nilai: {formatRupiah(redeemPoints * settings.points_redeem_value)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Status */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Receipt className="h-5 w-5" />
                                        Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baru">Baru</SelectItem>
                                            <SelectItem value="proses">Proses</SelectItem>
                                            <SelectItem value="selesai">Selesai</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN - Summary */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6">
                                <Card className="border-2 border-green-200 dark:border-green-900">
                                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                                        <CardTitle className="flex items-center gap-2">
                                            <Calculator className="h-5 w-5" />
                                            Ringkasan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Subtotal:</span>
                                                <span className="font-medium">{formatRupiah(calculation.subtotal_items)}</span>
                                            </div>
                                            {calculation.total_surcharge > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span>Biaya Tambahan:</span>
                                                    <span className="font-medium text-orange-600">+ {formatRupiah(calculation.total_surcharge)}</span>
                                                </div>
                                            )}
                                            {calculation.total_diskon > 0 && (
                                                <>
                                                    <Separator />
                                                    {calculation.diskon_promo > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span>Diskon Promo:</span>
                                                            <span className="font-medium text-green-600">- {formatRupiah(calculation.diskon_promo)}</span>
                                                        </div>
                                                    )}
                                                    {calculation.diskon_poin > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span>Diskon Poin:</span>
                                                            <span className="font-medium text-green-600">- {formatRupiah(calculation.diskon_poin)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {settings.auto_apply_tax && (
                                                <>
                                                    <Separator />
                                                    <div className="flex justify-between text-sm">
                                                        <span>Pajak ({settings.tax_rate}%):</span>
                                                        <span className="font-medium text-blue-600">+ {formatRupiah(calculation.pajak_amount)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <Separator />

                                        <div className="flex justify-between items-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                            <span className="font-bold">TOTAL:</span>
                                            <span className="text-2xl font-bold text-green-600">
                                                {formatRupiah(calculation.total_akhir)}
                                            </span>
                                        </div>

                                        {calculation.earned_points > 0 && (
                                            <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200">
                                                <TrendingUp className="h-4 w-4 text-amber-600" />
                                                <p className="text-sm font-medium">
                                                    +{calculation.earned_points} poin
                                                </p>
                                            </div>
                                        )}

                                        <Separator />

                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                onClick={handlePayNow}
                                                disabled={processing}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                Bayar Lunas
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleSaveLater}
                                                disabled={processing}
                                                variant="outline"
                                                className="w-full"
                                            >
                                                <Receipt className="mr-2 h-4 w-4" />
                                                Simpan & Bayar Nanti
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => router.visit(route('transaksi.index'))}
                                                variant="ghost"
                                                className="w-full"
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Batal
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Add Customer Dialog */}
            <Dialog open={showQuickAddCustomer} onOpenChange={setShowQuickAddCustomer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Customer Cepat</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleQuickAddCustomer}>
                        <div className="space-y-4">
                            <div>
                                <Label>Nama *</Label>
                                <Input
                                    value={quickAddForm.data.nama}
                                    onChange={(e) => quickAddForm.setData('nama', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>No. HP *</Label>
                                <Input
                                    value={quickAddForm.data.no_hp}
                                    onChange={(e) => quickAddForm.setData('no_hp', e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_member"
                                    checked={quickAddForm.data.is_member}
                                    onChange={(e) => quickAddForm.setData('is_member', e.target.checked)}
                                />
                                <Label htmlFor="is_member">Member Aktif</Label>
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowQuickAddCustomer(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={quickAddForm.processing}>
                                Tambah
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Pembayaran
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                            <div className="flex justify-between">
                                <span>Total Tagihan:</span>
                                <span className="text-xl font-bold text-blue-600">
                                    {formatRupiah(calculation.total_akhir)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <Label>Jumlah Bayar *</Label>
                            <Input
                                type="number"
                                step="1000"
                                min={calculation.total_akhir}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {paymentAmount && parseFloat(paymentAmount) >= calculation.total_akhir && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <div className="flex justify-between">
                                    <span>KEMBALIAN:</span>
                                    <span className="text-xl font-bold text-green-600">
                                        {formatRupiah(parseFloat(paymentAmount) - calculation.total_akhir)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {calculation.earned_points > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                                <Check className="h-4 w-4 text-amber-600" />
                                <p className="text-sm">
                                    Customer akan mendapat <strong>+{calculation.earned_points} poin</strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Batal
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handlePaymentSubmit}
                            disabled={processing || !paymentAmount || parseFloat(paymentAmount) < calculation.total_akhir}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Check className="mr-2 h-4 w-4" />
                            Konfirmasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}