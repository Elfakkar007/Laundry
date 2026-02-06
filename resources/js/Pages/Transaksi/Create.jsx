import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import LocationPicker from '@/Components/LocationPicker';
import axios from 'axios';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Separator } from '@/Components/ui/separator';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { toast } from 'sonner';
import { 
    ArrowLeft, Plus, Trash2, Store, User, Calendar, 
    Package, CreditCard, Tag, Gift, DollarSign, Calculator,
    X, Check, Crown, AlertCircle, TrendingUp, Truck, MapPin
} from 'lucide-react';

export default function TransaksiCreate({ 
    outlets, 
    customers, 
    pakets, 
    surcharges,
    shippingOptions, 
    promos, 
    settings,
    invoiceCode,
    selectedOutletId,
    isKasir,
    userOutlet,
    userName,
    flash,
    errors: serverErrors
}) {
    // ─── Outlet state ──────────────────────────────────────────────────────
    const [currentOutletId, setCurrentOutletId] = useState(selectedOutletId);
    const [currentInvoiceCode, setCurrentInvoiceCode] = useState(invoiceCode);
    const [currentPakets, setCurrentPakets] = useState(pakets);
    const [loadingOutletData, setLoadingOutletData] = useState(false);

    // ─── Customer state ────────────────────────────────────────────────────
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);

    // ─── NEW: Lazy-address state ───────────────────────────────────────────
    const [alamatUpdate, setAlamatUpdate] = useState('');

    // ─── Transaction items ─────────────────────────────────────────────────
    const [items, setItems] = useState([]);

    // ─── Surcharges (regular, NOT shipping) ───────────────────────────────
    const [selectedSurcharges, setSelectedSurcharges] = useState([]);
    const [surchargeDistances, setSurchargeDistances] = useState({});

    // ─── Shipping (separated) ─────────────────────────────────────────────
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [shippingDistance, setShippingDistance] = useState(0);

    // ─── Promo & Points ────────────────────────────────────────────────────
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [redeemPoints, setRedeemPoints] = useState(0);

    // ─── Payment dialog ────────────────────────────────────────────────────
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    // ─── Auto Shipping State ───────────────────────────────────────────────
    const [shippingLocation, setShippingLocation] = useState(null);
    const [calculatingShipping, setCalculatingShipping] = useState(false);
    const [autoShippingCost, setAutoShippingCost] = useState(0);
    const [autoShippingDistance, setAutoShippingDistance] = useState(0);

    const [autoDistance, setAutoDistance] = useState(0);
    const [autoCost, setAutoCost] = useState(0);
    const [showMap, setShowMap] = useState(false);

    // ─── Calculation state ─────────────────────────────────────────────────
    const [calculation, setCalculation] = useState({
        subtotal_items: 0,
        total_surcharge: 0,
        shipping_cost: 0,
        auto_shipping_cost: 0,
        auto_shipping_distance: 0,
        total_shipping: 0,
        base_for_discount: 0,
        gross_total_for_points: 0,
        diskon_promo: 0,
        diskon_poin: 0,
        total_diskon: 0,
        total_setelah_diskon: 0,
        total_dengan_shipping: 0,
        pajak_amount: 0,
        total_akhir: 0,
        earned_points: 0,
        max_redeemable_points: 0,
    });

    // ─── Derived: does the cashier need to supply an address? ─────────────
    const butuhAlamat =
        selectedShipping !== null &&
        calculation.shipping_cost > 0 &&
        selectedCustomer !== null &&
        !selectedCustomer.alamat;

    // ─── Sync customer id into form data ──────────────────────────────────
    useEffect(() => {
        if (selectedCustomer) {
            setData('id_customer', selectedCustomer.id);
        } else {
            setData('id_customer', null);
        }
    }, [selectedCustomer]);

    // Reset alamatUpdate whenever the customer changes
    useEffect(() => {
        setAlamatUpdate('');
    }, [selectedCustomer]);

    // ─── Form ──────────────────────────────────────────────────────────────
    const { data, setData, post, processing, errors } = useForm({
        id_outlet: currentOutletId,
        id_customer: null,
        tgl: new Date().toISOString().split('T')[0],
        batas_waktu: '',
        items: [],
        surcharges: [],
        surcharge_distances: {},
        shipping_id: null,
        shipping_distance: 0,
        id_promo: null,
        redeem_points: 0,
        payment_action: 'bayar_nanti',
        jumlah_bayar: null,
        alamat_update: null,
    });

    // ─── Quick-add customer form ──────────────────────────────────────────
    const quickAddForm = useForm({
        nama: '',
        no_hp: '',
    });

    // ─── Flash / server-error toasts ───────────────────────────────────────
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (serverErrors && Object.keys(serverErrors).length > 0) {
            Object.values(serverErrors).forEach(error => {
                toast.error(error);
            });
        }
    }, [serverErrors]);

    // ─── Helpers (Moved up for safety) ────────────────────────────────────
    const formatRupiah = (amount) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);

    // ─── Outlet switcher ──────────────────────────────────────────────────
    const handleOutletChange = async (outletId) => {
        if (isKasir) return;

        setLoadingOutletData(true);
        try {
            const response = await fetch(route('transaksi.outlet-data', outletId));
            const respData = await response.json();

            setCurrentOutletId(parseInt(outletId));
            setCurrentPakets(respData.pakets);
            setCurrentInvoiceCode(respData.invoiceCode);
            setItems([]);
            toast.success('Outlet berhasil diganti');
        } catch (error) {
            toast.error('Gagal mengambil data outlet');
        } finally {
            setLoadingOutletData(false);
        }
    };

    // ─── Item helpers ──────────────────────────────────────────────────────
    const addItem = () => {
        setItems([...items, { id: Date.now(), id_paket: '', qty: 1, keterangan: '' }]);
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // ─── Surcharge toggle ──────────────────────────────────────────────────
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

    // ─── Calculation Logic ────────────────────────────────────────────────
    const calculateAutoShipping = async (lat, lng) => {
        if (!currentOutletId || !lat || !lng) return;

        setCalculatingShipping(true);
        try {
            const response = await axios.post('/api/calculate-shipping', {
                outlet_id: currentOutletId,
                customer_lat: lat,
                customer_lng: lng,
            });

            if (response.data.success) {
                setAutoDistance(response.data.distance);
                setAutoCost(response.data.cost);
                
                // Auto-fill shipping distance field
                setShippingDistance(response.data.distance);
                
                toast.success(
                    `✓ Jarak: ${response.data.distance} km | Ongkir: ${formatRupiah(response.data.cost)}`
                );
            }
        } catch (error) {
            console.error('Shipping calculation failed:', error);
            toast.error(error.response?.data?.message || 'Gagal menghitung ongkir');
            setAutoDistance(0);
            setAutoCost(0);
        } finally {
            setCalculatingShipping(false);
        }
    };

    // ═══ Handle Shipping Option Change ═══
    const handleShippingChange = (shippingId) => {
        if (shippingId === 'none') {
            setSelectedShipping(null);
            setShowMap(false);
            setShippingLocation(null);
            setAutoDistance(0);
            setAutoCost(0);
            setShippingDistance(0);
        } else {
            const shipping = shippingOptions.find(s => s.id === parseInt(shippingId));
            setSelectedShipping(parseInt(shippingId));
            
            // Show map if it's distance-based shipping
            if (shipping && shipping.calculation_type === 'distance') {
                setShowMap(true);
            } else {
                setShowMap(false);
                setShippingLocation(null);
                setAutoDistance(0);
                setAutoCost(0);
            }
        }
    };
    
    useEffect(() => {
        calculateTotal();
    }, [items, selectedSurcharges, surchargeDistances, selectedShipping, shippingDistance, selectedPromo, redeemPoints, autoShippingCost]);

    const calculateTotal = () => {
        // Step 1: subtotal items
        let subtotalItems = 0;
        items.forEach(item => {
            if (item.id_paket) {
                const paket = currentPakets.find(p => p.id === parseInt(item.id_paket));
                if (paket) {
                    const qty = parseFloat(item.qty) || 0;
                    subtotalItems += qty * parseFloat(paket.harga);
                }
            }
        });

        // Step 2: surcharges (not shipping)
        let totalSurcharge = 0;
        selectedSurcharges.forEach(surchargeId => {
            const surcharge = surcharges.find(s => s.id === surchargeId);
            if (!surcharge) return;

            if (surcharge.min_order_total && subtotalItems >= surcharge.min_order_total) {
                return; // free surcharge
            }

            let amount = 0;
            switch (surcharge.calculation_type) {
                case 'percent':
                    amount = (subtotalItems * surcharge.nominal) / 100;
                    break;
                case 'distance':
                    amount = surcharge.nominal * (surchargeDistances[surchargeId] || 0);
                    break;
                case 'fixed':
                default:
                    amount = parseFloat(surcharge.nominal);
                    break;
            }
            totalSurcharge += amount;
        });

        // Step 3: Shipping cost calculation
        let shippingCost = 0;
        if (selectedShipping) {
            const shipping = shippingOptions.find(s => s.id === selectedShipping);
            if (shipping) {
                if (shipping.min_order_total && subtotalItems >= shipping.min_order_total) {
                    shippingCost = 0; // Free shipping
                } else {
                    switch (shipping.calculation_type) {
                        case 'percent':
                            shippingCost = (subtotalItems * shipping.nominal) / 100;
                            break;
                        case 'distance':
                            // Use auto-calculated distance OR manual input
                            const distance = autoDistance || shippingDistance || 0;
                            shippingCost = shipping.nominal * distance;
                            break;
                        case 'fixed':
                        default:
                            shippingCost = parseFloat(shipping.nominal);
                            break;
                    }
                }
            }
        }

        const baseForDiscount = subtotalItems + totalSurcharge;
        const grossTotalForPoints = baseForDiscount;

        // Promo & Points calculation (unchanged)
        let diskonPromo = 0;
        if (selectedPromo) {
            const promo = promos.find(p => p.id === selectedPromo);
            if (promo) {
                if (!promo.minimal_transaksi || baseForDiscount >= promo.minimal_transaksi) {
                    if (!promo.syarat_member_only || (selectedCustomer && selectedCustomer.is_member)) {
                        if (promo.jenis === 'percent') {
                            diskonPromo = (baseForDiscount * promo.diskon) / 100;
                        } else {
                            diskonPromo = Math.min(parseFloat(promo.diskon), baseForDiscount);
                        }
                    }
                }
            }
        }

        const pointsRedeemValue = settings.points_redeem_value;
        const customerAvailablePoints = selectedCustomer?.poin || 0;
        const remainingBillAfterPromo = Math.max(0, baseForDiscount - diskonPromo);
        const maxRedeemablePointsByBill = Math.floor(remainingBillAfterPromo / pointsRedeemValue);
        const maxRedeemablePoints = Math.min(customerAvailablePoints, maxRedeemablePointsByBill);
        const actualRedeemPoints = Math.min(redeemPoints, maxRedeemablePoints);
        const diskonPoin = actualRedeemPoints * pointsRedeemValue;

        const totalDiskon = diskonPromo + diskonPoin;
        const totalSetelahDiskon = Math.max(0, baseForDiscount - totalDiskon);
        const totalDenganShipping = totalSetelahDiskon + shippingCost;

        const pajakAmount = settings.auto_apply_tax
            ? (totalDenganShipping * settings.tax_rate / 100)
            : 0;

        const totalAkhir = totalDenganShipping + pajakAmount;

        let earnedPoints = 0;
        if (selectedCustomer && selectedCustomer.is_member && settings.points_enabled) {
            earnedPoints = Math.floor(grossTotalForPoints / settings.points_earn_ratio);
        }

        setCalculation({
            subtotal_items: subtotalItems,
            total_surcharge: totalSurcharge,
            shipping_cost: shippingCost,
            auto_distance: autoDistance,
            auto_cost: autoCost,
            base_for_discount: baseForDiscount,
            gross_total_for_points: grossTotalForPoints,
            diskon_promo: diskonPromo,
            diskon_poin: diskonPoin,
            total_diskon: totalDiskon,
            total_setelah_diskon: totalSetelahDiskon,
            total_dengan_shipping: totalDenganShipping,
            pajak_amount: pajakAmount,
            total_akhir: totalAkhir,
            earned_points: earnedPoints,
            max_redeemable_points: maxRedeemablePoints,
        });
    };

    // ─── Quick-add customer submit ─────────────────────────────────────────
    const handleQuickAddCustomer = (e) => {
        e.preventDefault();
        quickAddForm.post(route('customers.store'), {
            onSuccess: () => {
                toast.success('Customer berhasil ditambahkan!');
                setShowQuickAddCustomer(false);
                quickAddForm.reset();
                // Opsional: Reload data customer jika menggunakan Inertia visit atau state management
                router.reload({ only: ['customers'] });
            },
        });
    };

    // ─── Build Payload ─────────────────────────────────────────────────────
    const buildPayload = (paymentAction, jumlahBayar) => {
        const cleanItems = items
            .filter(item => item.id_paket && item.id_paket !== '' && item.id_paket !== 'none' && !isNaN(item.id_paket))
            .map(({ id, ...rest }) => ({
                id_paket: parseInt(rest.id_paket),
                qty: parseFloat(rest.qty) || 0,
                keterangan: rest.keterangan || null,
            }));

        return {
            id_outlet: currentOutletId,
            id_customer: selectedCustomer.id,
            tgl: data.tgl,
            batas_waktu: data.batas_waktu,
            items: cleanItems,
            surcharges: selectedSurcharges,
            surcharge_distances: surchargeDistances,
            shipping_id: selectedShipping,
            shipping_distance: shippingDistance,
            auto_shipping_cost: autoShippingCost, // Jika perlu disimpan
            id_promo: selectedPromo,
            redeem_points: Math.min(redeemPoints, calculation.max_redeemable_points),
            payment_action: paymentAction,
            jumlah_bayar: jumlahBayar,
            alamat_update: butuhAlamat && alamatUpdate.trim() ? alamatUpdate.trim() : null,
        };
    };

    // ─── Save Later ────────────────────────────────────────────────────────
    const handleSaveLater = () => {
        if (!validateForm()) return;

        router.post(route('transaksi.store'), buildPayload('bayar_nanti', null), {
            onError: (errs) => {
                Object.values(errs).forEach(error => toast.error(error));
            },
        });
    };

    // ─── Pay Now (opens dialog) ────────────────────────────────────────────
    const handlePayNow = () => {
        if (!validateForm()) return;
        setPaymentAmount(calculation.total_akhir.toString());
        setShowPaymentDialog(true);
    };

    // ─── Payment dialog submit ─────────────────────────────────────────────
    const handlePaymentSubmit = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount < calculation.total_akhir) {
            toast.error('Jumlah bayar kurang dari total tagihan!');
            return;
        }

        router.post(route('transaksi.store'), buildPayload('bayar_lunas', amount), {
            onSuccess: () => setShowPaymentDialog(false),
            onError: (errs) => {
                Object.values(errs).forEach(error => toast.error(error));
            },
        });
    };

    // ─── Validation ────────────────────────────────────────────────────────
    const validateForm = () => {
        if (!currentOutletId) {
            toast.error('Pilih outlet terlebih dahulu!');
            return false;
        }

        if (!selectedCustomer) {
            toast.error('Pilih customer terlebih dahulu!');
            return false;
        }

        const validItems = items.filter(item =>
            item.id_paket && item.id_paket !== '' && item.id_paket !== 'none' && !isNaN(item.id_paket)
        );

        if (validItems.length === 0) {
            toast.error('Tambahkan minimal 1 item paket!');
            return false;
        }

        for (const item of validItems) {
            const qty = parseFloat(item.qty) || 0;
            if (qty <= 0) {
                toast.error('Quantity tidak boleh 0 atau kosong!');
                return false;
            }

            const paket = currentPakets.find(p => p.id === parseInt(item.id_paket));
            if (paket && parseFloat(paket.harga) <= 0) {
                toast.error(`Paket "${paket.nama_paket}" memiliki harga Rp0 dan tidak dapat digunakan!`);
                return false;
            }
        }

        if (!data.batas_waktu) {
            toast.error('Tentukan batas waktu pengerjaan!');
            return false;
        }

        if (butuhAlamat && !alamatUpdate.trim()) {
            toast.error('Alamat pengiriman wajib diisi karena ongkir dipilih!');
            return false;
        }

        return true;
    };

    const isPromoEligible = (promo) => {
        if (!promo) return false;
        if (promo.syarat_member_only && (!selectedCustomer || !selectedCustomer.is_member)) return false;
        if (promo.minimal_transaksi && calculation.base_for_discount < promo.minimal_transaksi) return false;
        return true;
    };

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit(route('transaksi.index'))}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                            Transaksi Baru
                        </h2>
                        <p className="text-sm text-gray-500">Buat transaksi laundry baru (Status otomatis: Baru)</p>
                    </div>
                </div>
            }
        >
            <Head title="Transaksi Baru" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Admin warning */}
                    {!isKasir && !currentOutletId && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Peringatan:</strong> Pilih outlet terlebih dahulu untuk memulai transaksi!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ── Header card ──────────────────────────────────────── */}
                    <Card className="border-2 border-blue-200 dark:border-blue-900">
                        <CardContent className="pt-6">
                            {isKasir ? (
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Outlet</p>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">{userOutlet.nama}</p>
                                            </div>
                                        </div>
                                        <Separator orientation="vertical" className="h-10" />
                                        <div className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Kasir</p>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">{userName}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Invoice</p>
                                        <p className="text-xl font-bold text-blue-600">{currentInvoiceCode}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="outlet">Outlet *</Label>
                                        <Select
                                            value={currentOutletId?.toString() || 'none'}
                                            onValueChange={(value) => value !== 'none' && handleOutletChange(parseInt(value))}
                                            disabled={loadingOutletData}
                                        >
                                            <SelectTrigger className={!currentOutletId ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Pilih Outlet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- Pilih Outlet --</SelectItem>
                                                {outlets?.map((outlet) => (
                                                    <SelectItem key={outlet.id} value={outlet.id.toString()}>{outlet.nama}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        {currentInvoiceCode ? (
                                            <div className="flex-1 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-900">
                                                <p className="text-xs text-gray-500">Invoice Code</p>
                                                <p className="text-xl font-bold text-blue-600">{currentInvoiceCode}</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                                                <p className="text-xs text-gray-500">Invoice Code</p>
                                                <p className="text-sm text-gray-400">Pilih outlet terlebih dahulu</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Main content ─────────────────────────────────────── */}
                    {(isKasir || currentOutletId) && (
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* ── LEFT COLUMN ──────────────────────────── */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Customer & Date */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            Informasi Customer &amp; Jadwal
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
                                                            setRedeemPoints(0);
                                                        } else {
                                                            const cust = customers.find(c => c.id === parseInt(value));
                                                            setSelectedCustomer(cust);
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
                                                                    {customer.is_member && <Crown className="h-3 w-3 text-yellow-500" />}
                                                                    <span className="text-xs text-gray-500">({customer.no_hp})</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" onClick={() => setShowQuickAddCustomer(true)}>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Tambah
                                                </Button>
                                            </div>

                                            {/* Customer chip */}
                                            {selectedCustomer && (
                                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium">{selectedCustomer.nama}</p>
                                                            <p className="text-xs text-gray-500">{selectedCustomer.no_hp}</p>
                                                            {/* show existing address if present */}
                                                            {selectedCustomer.alamat && (
                                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                                    <MapPin className="h-3 w-3" />
                                                                    {selectedCustomer.alamat}
                                                                </p>
                                                            )}
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
                                                <Input id="tgl" type="date" value={data.tgl} onChange={(e) => setData('tgl', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label htmlFor="batas_waktu">Batas Waktu Selesai *</Label>
                                                <Input id="batas_waktu" type="datetime-local" value={data.batas_waktu} onChange={(e) => setData('batas_waktu', e.target.value)} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Items */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-5 w-5" />
                                                Paket Layanan
                                            </div>
                                            <Button type="button" onClick={addItem} size="sm" disabled={currentPakets.length === 0}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Tambah
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {currentPakets.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                <p>Tidak ada paket tersedia untuk outlet ini.</p>
                                            </div>
                                        ) : items.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                <p>Belum ada paket. Klik "Tambah" untuk menambah item.</p>
                                            </div>
                                        ) : (
                                            items.map((item, index) => {
                                                const selectedPaket = currentPakets.find(p => p.id === parseInt(item.id_paket));
                                                const qty = parseFloat(item.qty) || 0;
                                                const subtotal = selectedPaket ? qty * parseFloat(selectedPaket.harga) : 0;

                                                return (
                                                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Badge variant="outline">Item #{index + 1}</Badge>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="grid md:grid-cols-4 gap-3">
                                                            <div className="md:col-span-2">
                                                                <Label>Paket *</Label>
                                                                <Select
                                                                    value={item.id_paket?.toString() || 'none'}
                                                                    onValueChange={(value) =>
                                                                        updateItem(item.id, 'id_paket', value === 'none' ? '' : parseInt(value))
                                                                    }
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
                                                                <Input type="number" step="0.01" min="0.01" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <Label>Subtotal</Label>
                                                                <div className="h-9 flex items-center px-3 bg-gray-50 dark:bg-gray-900 border rounded-md">
                                                                    <span className="font-semibold text-green-600">{formatRupiah(subtotal)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label>Keterangan</Label>
                                                            <Input placeholder="Contoh: Noda kopi, pewangi extra" value={item.keterangan} onChange={(e) => updateItem(item.id, 'keterangan', e.target.value)} />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Surcharges (non-shipping) */}
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
                                                const isFree = surcharge.min_order_total && calculation.subtotal_items >= surcharge.min_order_total;

                                                return (
                                                    <div key={surcharge.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSurcharge(surcharge.id)} className="mt-1" disabled={isFree} />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{surcharge.nama}</p>
                                                                {isFree && <Badge className="bg-green-600">GRATIS</Badge>}
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {surcharge.calculation_type === 'percent' && `${surcharge.nominal}%`}
                                                                {surcharge.calculation_type === 'fixed' && formatRupiah(surcharge.nominal)}
                                                                {surcharge.calculation_type === 'distance' && `${formatRupiah(surcharge.nominal)}/km`}
                                                            </p>
                                                        </div>
                                                        {isSelected && surcharge.calculation_type === 'distance' && (
                                                            <Input
                                                                type="number" step="0.1" min="0" placeholder="Jarak (km)"
                                                                value={surchargeDistances[surcharge.id] || ''}
                                                                onChange={(e) => setSurchargeDistances({ ...surchargeDistances, [surcharge.id]: parseFloat(e.target.value) || 0 })}
                                                                className="w-32"
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}

                               {/* ═══ UNIFIED SHIPPING SECTION (Manual + Auto with Map) ═══ */}
                            {shippingOptions.length > 0 && (
                                <Card className="border-2 border-orange-200 dark:border-orange-900">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Truck className="h-5 w-5 text-orange-600" />
                                            Pengiriman & Ongkos Kirim
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Shipping Option Selector */}
                                        <div>
                                            <Label>Pilih Opsi Pengiriman</Label>
                                            <Select
                                                value={selectedShipping?.toString() || 'none'}
                                                onValueChange={handleShippingChange}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tidak ada pengiriman" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Tidak ada pengiriman</SelectItem>
                                                    {shippingOptions.map((shipping) => {
                                                        const isFree = shipping.min_order_total && 
                                                                    calculation.subtotal_items >= shipping.min_order_total;
                                                        return (
                                                            <SelectItem key={shipping.id} value={shipping.id.toString()}>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{shipping.nama}</span>
                                                                    {shipping.calculation_type === 'distance' && (
                                                                        <MapPin className="h-3 w-3 text-purple-600" />
                                                                    )}
                                                                    <span className="text-xs text-gray-500">
                                                                        - {shipping.formatted_nominal}
                                                                        {isFree && ' (GRATIS)'}
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {selectedShipping ? 
                                                    shippingOptions.find(s => s.id === selectedShipping)?.calculation_type === 'distance' ?
                                                        '📍 Pilih lokasi di peta untuk kalkulasi otomatis' :
                                                        'Biaya tetap akan ditambahkan ke total'
                                                    : 'Customer ambil sendiri / tanpa ongkir'
                                                }
                                            </p>
                                        </div>

                                        {/* MAP SECTION - Show only for distance-based shipping */}
                                        {showMap && selectedShipping && (
                                            <>
                                                <Separator />
                                                
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-base font-semibold">
                                                            Tentukan Lokasi Pengantaran
                                                        </Label>
                                                        {calculatingShipping && (
                                                            <div className="flex items-center gap-2 text-blue-600">
                                                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                                <span className="text-xs">Menghitung...</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <LocationPicker
                                                        initialLat={shippingLocation?.lat || -6.2088}
                                                        initialLng={shippingLocation?.lng || 106.8456}
                                                        onLocationChange={(location) => {
                                                            setShippingLocation(location);
                                                            calculateAutoShipping(location.lat, location.lng);
                                                        }}
                                                        height="350px"
                                                    />

                                                    {/* Selected Address Display */}
                                                    {shippingLocation && (
                                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                                            <div className="flex items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-medium text-gray-500">
                                                                        Alamat Pengantaran:
                                                                    </p>
                                                                    <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                                                        {shippingLocation.address}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Calculation Result */}
                                                    {!calculatingShipping && autoDistance > 0 && (
                                                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border-2 border-green-200 dark:border-green-900">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">Jarak dari Outlet</p>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-2xl font-bold text-green-600">
                                                                            {autoDistance}
                                                                        </span>
                                                                        <span className="text-sm text-gray-600">km</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs text-gray-500 mb-1">Biaya Ongkir</p>
                                                                    <div className="text-xl font-bold text-orange-600">
                                                                        {formatRupiah(autoCost)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-green-700 dark:text-green-400 mt-3 flex items-center gap-1">
                                                                <Check className="h-3 w-3" />
                                                                Jarak otomatis terisi ke field pengiriman
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Manual Distance Override (if needed) */}
                                                    <div>
                                                        <Label htmlFor="shipping_distance">
                                                            Jarak Pengiriman (km)
                                                            {autoDistance > 0 && (
                                                                <span className="text-xs text-green-600 ml-2">
                                                                    ✓ Terisi otomatis
                                                                </span>
                                                            )}
                                                        </Label>
                                                        <Input
                                                            id="shipping_distance"
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            value={shippingDistance || autoDistance}
                                                            onChange={(e) => setShippingDistance(parseFloat(e.target.value) || 0)}
                                                            placeholder="Masukkan jarak dalam kilometer"
                                                            className={autoDistance > 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-300' : ''}
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {autoDistance > 0 ? 
                                                                'Jarak dihitung otomatis dari peta. Anda bisa ubah manual jika perlu.' :
                                                                'Pilih lokasi di peta untuk kalkulasi otomatis'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Non-distance shipping (fixed/percent) - Show total */}
                                        {selectedShipping && !showMap && calculation.shipping_cost > 0 && (
                                            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">Biaya Ongkir:</span>
                                                    <span className="text-lg font-bold text-orange-600">
                                                        {formatRupiah(calculation.shipping_cost)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                                {/* Promo & Points */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Tag className="h-5 w-5" />
                                            Diskon &amp; Promo
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
                                                        <SelectItem key={promo.id} value={promo.id.toString()} disabled={!isPromoEligible(promo)}>
                                                            {promo.nama_promo} ({promo.jenis === 'percent' ? `${promo.diskon}%` : formatRupiah(promo.diskon)})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Diskon hanya berlaku untuk Item + Biaya Tambahan (tidak termasuk ongkir)
                                            </p>
                                        </div>

                                        {/* Points redemption (member only) */}
                                        {selectedCustomer && selectedCustomer.is_member && selectedCustomer.poin > 0 && (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900 rounded-lg space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Gift className="h-5 w-5 text-amber-600" />
                                                    <p className="font-semibold">Tukar Poin</p>
                                                </div>
                                                <div>
                                                    <Label>Jumlah Poin</Label>
                                                    <Input
                                                        type="number" min="0" max={calculation.max_redeemable_points}
                                                        value={redeemPoints}
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value) || 0;
                                                            const clamped = Math.min(value, calculation.max_redeemable_points);
                                                            setRedeemPoints(clamped);
                                                            if (value > clamped) {
                                                                toast.warning(`Poin otomatis disesuaikan menjadi ${clamped} (maksimal yang dapat ditukar)`);
                                                            }
                                                        }}
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Maksimal: {calculation.max_redeemable_points} poin ({formatRupiah(calculation.max_redeemable_points * settings.points_redeem_value)})
                                                    </p>
                                                    <p className="mt-1 text-xs text-amber-600">
                                                        ⚠️ Poin tidak akan terbuang - sistem mencegah penukaran berlebih
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* ── RIGHT COLUMN – Summary ──────────────── */}
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
                                                    <span>Subtotal Items:</span>
                                                    <span className="font-medium">{formatRupiah(calculation.subtotal_items)}</span>
                                                </div>
                                                {calculation.total_surcharge > 0 && (
                                                    <div className="flex justify-between text-sm">
                                                        <span>Biaya Tambahan:</span>
                                                        <span className="font-medium text-orange-600">+ {formatRupiah(calculation.total_surcharge)}</span>
                                                    </div>
                                                )}

                                                {/* Shipping Summary */}
                                              {calculation.shipping_cost > 0 && (
                                                    <>
                                                        <Separator />
                                                        <div className="flex justify-between text-sm">
                                                            <span className="flex items-center gap-1">
                                                                <Truck className="h-3 w-3" />
                                                                Ongkir{autoDistance > 0 && ` (${autoDistance} km)`}:
                                                            </span>
                                                            <span className="font-medium text-orange-600">
                                                                + {formatRupiah(calculation.shipping_cost)}
                                                            </span>
                                                        </div>
                                                    </>
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
                                                <span className="text-2xl font-bold text-green-600">{formatRupiah(calculation.total_akhir)}</span>
                                            </div>

                                            {calculation.earned_points > 0 && (
                                                <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200">
                                                    <TrendingUp className="h-4 w-4 text-amber-600" />
                                                    <p className="text-sm font-medium">+{calculation.earned_points} poin</p>
                                                </div>
                                            )}

                                            <p className="text-xs text-center text-gray-500">
                                                Poin dihitung dari {formatRupiah(calculation.gross_total_for_points)} (sebelum diskon, tanpa ongkir)
                                            </p>

                                            <Separator />

                                            <div className="space-y-2">
                                                <Button type="button" onClick={handlePayNow} disabled={processing} className="w-full bg-green-600 hover:bg-green-700">
                                                    <DollarSign className="mr-2 h-4 w-4" />
                                                    Bayar Lunas
                                                </Button>
                                                <Button type="button" onClick={handleSaveLater} disabled={processing} variant="outline" className="w-full">
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    Simpan &amp; Bayar Nanti
                                                </Button>
                                                <Button type="button" onClick={() => router.visit(route('transaksi.index'))} variant="ghost" className="w-full">
                                                    <X className="mr-2 h-4 w-4" />
                                                    Batal
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick-add customer dialog (Name + Phone ONLY) ──────────── */}
            <Dialog open={showQuickAddCustomer} onOpenChange={setShowQuickAddCustomer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Customer Cepat</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleQuickAddCustomer}>
                        <div className="space-y-4">
                            <div>
                                <Label>Nama *</Label>
                                <Input value={quickAddForm.data.nama} onChange={(e) => quickAddForm.setData('nama', e.target.value)} placeholder="Nama lengkap" />
                                {quickAddForm.errors.nama && <p className="mt-1 text-sm text-red-500">{quickAddForm.errors.nama}</p>}
                            </div>
                            <div>
                                <Label>No. HP *</Label>
                                <Input value={quickAddForm.data.no_hp} onChange={(e) => quickAddForm.setData('no_hp', e.target.value)} placeholder="08xxxxxxxxxx" />
                                {quickAddForm.errors.no_hp && <p className="mt-1 text-sm text-red-500">{quickAddForm.errors.no_hp}</p>}
                                <p className="mt-1 text-xs text-gray-500">Alamat dan status member akan diset secara otomatis sesuai kebutuhan.</p>
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowQuickAddCustomer(false)}>Batal</Button>
                            <Button type="submit" disabled={quickAddForm.processing}>Tambah</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Payment dialog ──────────────────────────────────────────── */}
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
                                <span className="text-xl font-bold text-blue-600">{formatRupiah(calculation.total_akhir)}</span>
                            </div>
                        </div>

                        <div>
                            <Label>Jumlah Bayar *</Label>
                            <Input type="number" step="1000" min={calculation.total_akhir} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
                        </div>

                        {paymentAmount && parseFloat(paymentAmount) >= calculation.total_akhir && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <div className="flex justify-between">
                                    <span>KEMBALIAN:</span>
                                    <span className="text-xl font-bold text-green-600">{formatRupiah(parseFloat(paymentAmount) - calculation.total_akhir)}</span>
                                </div>
                            </div>
                        )}

                        {calculation.earned_points > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                                <Check className="h-4 w-4 text-amber-600" />
                                <p className="text-sm">Customer akan mendapat <strong>+{calculation.earned_points} poin</strong></p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>Batal</Button>
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