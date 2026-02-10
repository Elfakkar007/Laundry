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

    const [useExistingAddress, setUseExistingAddress] = useState(true);
    const [isEditingAddress, setIsEditingAddress] = useState(false);

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
    // Sync customer data into form
    useEffect(() => {
        if (selectedCustomer) {
            setData(d => ({
                ...d,
                id_customer: selectedCustomer.id,
                alamat_lengkap: selectedCustomer.alamat || '',
                customer_lat: selectedCustomer.latitude,
                customer_lng: selectedCustomer.longitude,
            }));
        } else {
            setData(d => ({
                ...d,
                id_customer: null,
                alamat_lengkap: '',
                customer_lat: null,
                customer_lng: null,
            }));
        }
    }, [selectedCustomer]);

    // Ganti customer → clear lokasi yang dipilih agar tidak dipakai untuk customer lain (terutama non-member)
    useEffect(() => {
        setShippingLocation(null);
        setAutoDistance(0);
        setAutoCost(0);
        setShippingDistance(0);
    }, [selectedCustomer?.id]);

    // Format tanggal+waktu untuk input datetime-local (YYYY-MM-DDTHH:mm)
    const toDateTimeLocal = (date = new Date()) => {
        const d = date instanceof Date ? date : new Date(date);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // ─── Form ──────────────────────────────────────────────────────────────
    const { data, setData, post, processing, errors } = useForm({
        id_outlet: currentOutletId,
        id_customer: null,
        tgl: toDateTimeLocal(),
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
        // NEW Shipping fields
        customer_lat: null,
        customer_lng: null,
        alamat_lengkap: '',
        catatan_lokasi: '',
        distance_km: 0,
        shipping_cost: 0,
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

    useEffect(() => {
        if (!selectedShipping || !selectedCustomer) {
            setShowMap(false);
            setIsEditingAddress(false);
            setUseExistingAddress(true);
            return;
        }

        const shipping = shippingOptions.find((s) => s.id === selectedShipping);
        if (!shipping || shipping.calculation_type !== 'distance') {
            setShowMap(false);
            setIsEditingAddress(false);
            setUseExistingAddress(true);
            return;
        }

        const hasCoords =
            selectedCustomer.latitude != null && selectedCustomer.longitude != null;
        const punyaAlamatDanCoords = selectedCustomer.alamat && hasCoords;

        // Kalau kasir lagi MODE EDIT alamat (setelah klik \"Ganti Lokasi Pengiriman\"),
        // jangan auto-switch kembali ke alamat lama meskipun customer sudah punya koordinat.
        if (isEditingAddress) {
            setShowMap(true);
            setUseExistingAddress(false);
            return;
        }

        // Mode normal (tidak sedang edit):
        if (punyaAlamatDanCoords) {
            // Customer sudah punya alamat + koordinat → default pakai alamat tersimpan, tanpa peta
            setUseExistingAddress(true);
            setIsEditingAddress(false);
            setShowMap(false);
        } else {
            // Belum punya alamat/koordinat → wajib pilih di peta
            if (!shippingLocation?.address) {
                setShowMap(true);
                setUseExistingAddress(false);
                setIsEditingAddress(true);
            }
        }
    }, [selectedShipping, selectedCustomer, shippingOptions, shippingLocation, isEditingAddress]);

    // ─── Fetch ongkir untuk alamat tersimpan (auto-fetch saat customer dipilih)
    useEffect(() => {
        if (!selectedCustomer?.alamat || !selectedShipping || !currentOutletId) {
            setAutoDistance(0);
            setAutoCost(0);
            setShippingDistance(0);
            return;
        }

        const shipping = shippingOptions.find(s => s.id === selectedShipping);
        if (!shipping || shipping.calculation_type !== 'distance') {
            setAutoDistance(0);
            setAutoCost(0);
            setShippingDistance(0);
            return;
        }

        const lat = selectedCustomer.latitude != null ? parseFloat(selectedCustomer.latitude) : null;
        const lng = selectedCustomer.longitude != null ? parseFloat(selectedCustomer.longitude) : null;

        // FIXED: Hapus kondisi useExistingAddress === false yang menyebabkan fetch tidak jalan
        if (lat == null || lng == null) {
            return;
        }

        // Skip jika sedang edit address (biar map yang handle)
        if (isEditingAddress) {
            return;
        }

        let cancelled = false;
        setCalculatingShipping(true);

        const payload = {
            outlet_id: currentOutletId,
            customer_lat: lat,
            customer_lng: lng,
        };
        if (selectedShipping) payload.shipping_id = selectedShipping;

        axios.post('/api/calculate-shipping', payload)
            .then((response) => {
                if (cancelled || !response.data.success) return;

                // Update form data with calculated distance/cost
                setData(d => ({
                    ...d,
                    distance_km: response.data.distance,
                    shipping_cost: response.data.cost
                }));

                setAutoDistance(response.data.distance);
                setAutoCost(response.data.cost);
                setShippingDistance(response.data.distance);
            })
            .catch(() => {
                if (!cancelled) {
                    setAutoDistance(0);
                    setAutoCost(0);
                    setShippingDistance(0);
                }
            })
            .finally(() => {
                if (!cancelled) setCalculatingShipping(false);
            });

        return () => { cancelled = true; };
    }, [
        selectedCustomer?.id,
        selectedCustomer?.alamat,
        selectedCustomer?.latitude,
        selectedCustomer?.longitude,
        selectedShipping,
        currentOutletId,
        isEditingAddress
    ]);

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

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || errData.message || 'Gagal mengambil data');
            }

            const respData = await response.json();

            setCurrentOutletId(parseInt(outletId));
            setCurrentPakets(respData.pakets || []);
            setCurrentInvoiceCode(respData.invoiceCode);
            setItems([]);
            toast.success('Outlet berhasil diganti');
        } catch (error) {
            console.error('Outlet change error:', error);
            toast.error(error.message || 'Gagal mengambil data outlet');
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
                // If customer has no address, automatically enter edit mode so they can pick one
                if (!data.alamat_lengkap) {
                    setIsEditingAddress(true);
                    setUseExistingAddress(false);
                }
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
    }, [items, selectedSurcharges, surchargeDistances, selectedShipping, shippingDistance, selectedPromo, redeemPoints, autoShippingCost, autoDistance]);

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
                            let distance = 0;
                            if (useExistingAddress && selectedCustomer?.alamat) {
                                // Pakai jarak dari alamat tersimpan (sudah di-fetch di useEffect)
                                distance = autoDistance || shippingDistance || 0;
                            } else {
                                distance = autoDistance || shippingDistance || 0;
                            }
                            shippingCost = shipping.nominal * distance;
                            // #endregion
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

        // NEW: Multiple Promo Calculation - Apply sequentially
        const eligiblePromos = selectAllEligiblePromos();
        let appliedPromos = [];
        let remainingAmount = baseForDiscount;
        let totalDiskonPromo = 0;

        eligiblePromos.forEach(promo => {
            if (remainingAmount <= 0) return;

            // Re-check minimal transaksi with remaining amount
            if (promo.minimal_transaksi && remainingAmount < promo.minimal_transaksi) {
                return;
            }

            let discount = 0;
            if (promo.jenis === 'percent') {
                discount = (remainingAmount * promo.diskon) / 100;
            } else {
                discount = Math.min(parseFloat(promo.diskon), remainingAmount);
            }

            if (discount > 0) {
                appliedPromos.push({
                    id: promo.id,
                    nama: promo.nama_promo,
                    jenis: promo.jenis,
                    nilai: promo.diskon,
                    amount: discount,
                    is_member_only: promo.syarat_member_only,
                });

                totalDiskonPromo += discount;
                remainingAmount -= discount;
            }
        });

        // Points redemption
        const pointsRedeemValue = settings.points_redeem_value;
        const customerAvailablePoints = selectedCustomer?.poin || 0;
        const remainingBillAfterPromo = Math.max(0, baseForDiscount - totalDiskonPromo);
        const maxRedeemablePointsByBill = Math.floor(remainingBillAfterPromo / pointsRedeemValue);
        const maxRedeemablePoints = Math.min(customerAvailablePoints, maxRedeemablePointsByBill);
        const actualRedeemPoints = Math.min(redeemPoints, maxRedeemablePoints);
        const diskonPoin = actualRedeemPoints * pointsRedeemValue;

        const totalDiskon = totalDiskonPromo + diskonPoin;
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
            diskon_promo: totalDiskonPromo,
            applied_promos: appliedPromos, // NEW: Array of applied promos
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

    // Toggle edit address mode
    const handleChangeAddress = () => {
        setIsEditingAddress(true);
        setUseExistingAddress(false);
        setShowMap(true);
        setShippingLocation(null);
        setAutoDistance(0);
        setAutoCost(0);
        setShippingDistance(0);
    };

    // Cancel edit address - kembali ke existing
    const handleCancelEditAddress = () => {
        if (!selectedCustomer.alamat) {
            toast.error('Customer belum punya alamat terdaftar. Pilih lokasi pengiriman terlebih dahulu.');
            return;
        }
        setIsEditingAddress(false);
        setUseExistingAddress(true);
        setShowMap(false);
        setShippingLocation(null);
        setAutoDistance(0);
        setAutoCost(0);
        setShippingDistance(0);
        toast.info('Menggunakan alamat terdaftar');
    };

    // Confirm new address from Map
    const handleConfirmNewAddress = () => {
        if (!shippingLocation?.address) {
            toast.error('Pilih lokasi di peta terlebih dahulu');
            return;
        }

        const lat = shippingLocation.lat != null ? parseFloat(shippingLocation.lat) : null;
        const lng = shippingLocation.lng != null ? parseFloat(shippingLocation.lng) : null;

        if (lat == null || lng == null) {
            toast.error('Koordinat lokasi tidak valid');
            return;
        }

        // Update form data directly
        setData(d => ({
            ...d,
            alamat_lengkap: shippingLocation.address,
            customer_lat: lat,
            customer_lng: lng
        }));

        // Trigger calculation (optional since we have useEffects, but good for immediate feedback)
        calculateAutoShipping(lat, lng);

        setIsEditingAddress(false);
        setUseExistingAddress(false); // We are using a manually picked location
        setShowMap(false);

        toast.success('Lokasi berhasil dipilih');
    };


    const selectAllEligiblePromos = () => {
        if (!selectedCustomer) return [];

        const baseAmount = calculation.base_for_discount;
        if (baseAmount === 0) return [];

        const eligiblePromos = promos.filter(promo => {
            if (!promo.is_active || !promo.is_stackable) return false;
            if (promo.syarat_member_only && !selectedCustomer.is_member) return false;
            if (promo.minimal_transaksi && baseAmount < promo.minimal_transaksi) return false;

            const now = new Date();
            if (promo.tanggal_mulai && new Date(promo.tanggal_mulai) > now) return false;
            if (promo.tanggal_selesai && new Date(promo.tanggal_selesai) < now) return false;

            return true;
        });

        return eligiblePromos.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
    };

    // TAMBAHKAN FUNGSI INI DI SINI ↓↓↓
    const getPromoInfo = () => {
        if (!selectedCustomer) {
            return {
                hasEligible: false,
                eligibleCount: 0,
                promos: [],
            };
        }

        const eligiblePromos = selectAllEligiblePromos();

        return {
            hasEligible: eligiblePromos.length > 0,
            eligibleCount: eligiblePromos.length,
            promos: eligiblePromos,
        };
    };

    const buildPayload = (paymentAction, jumlahBayar) => {
        const cleanItems = items
            .filter(item => item.id_paket && item.id_paket !== '' && item.id_paket !== 'none' && !isNaN(item.id_paket))
            .map(({ id, ...rest }) => ({
                id_paket: parseInt(rest.id_paket),
                qty: parseFloat(rest.qty) || 0,
                keterangan: rest.keterangan || null,
            }));

        // UPDATED ALAMAT LOGIC
        let finalAlamatUpdate = null;
        let finalShippingDistance = 0;

        if (butuhAlamat) {
            if (useExistingAddress && selectedCustomer.alamat) {
                // Pakai alamat existing - kirim jarak yang sudah dihitung dari koordinat customer
                finalAlamatUpdate = null;
                finalShippingDistance = autoDistance || shippingDistance || 0;
            } else {
                // Pakai alamat baru dari map - akan update customer.alamat + koordinat
                finalAlamatUpdate = shippingLocation?.address || null;
                finalShippingDistance = autoDistance || shippingDistance || 0;
            }
        } else if (selectedShipping && (autoDistance > 0 || shippingDistance > 0)) {
            // Customer punya alamat → butuhAlamat false, tapi ongkir tetap harus dikirim
            // agar nominal di backend sama dengan yang ditampilkan di Create
            finalShippingDistance = autoDistance || shippingDistance || 0;
            // Jika user pilih lokasi di peta (mis. alamat ada tapi belum ada koordinat), simpan ke customer
            if (shippingLocation?.address) {
                finalAlamatUpdate = shippingLocation.address;
            }
        }



        const payloadData = {
            id_outlet: currentOutletId,
            id_customer: selectedCustomer.id,
            tgl: data.tgl,
            batas_waktu: data.batas_waktu,
            items: cleanItems,
            surcharges: selectedSurcharges,
            surcharge_distances: surchargeDistances,
            shipping_id: selectedShipping,
            redeem_points: Math.min(redeemPoints, calculation.max_redeemable_points),
            payment_action: paymentAction,
            jumlah_bayar: jumlahBayar,
        };

        // If delivery, send all location data
        if (selectedShipping && selectedShipping !== 'none') {
            payloadData.customer_lat = data.customer_lat;
            payloadData.customer_lng = data.customer_lng;
            payloadData.alamat_lengkap = data.alamat_lengkap;
            payloadData.catatan_lokasi = data.catatan_lokasi;
            payloadData.distance_km = autoDistance || shippingDistance; // Use calculated distance
            payloadData.shipping_cost = calculation.shipping_cost;
        } else {
            // Pickup / No shipping
            payloadData.customer_lat = null;
            payloadData.customer_lng = null;
            payloadData.alamat_lengkap = null;
            payloadData.catatan_lokasi = null;
            payloadData.distance_km = 0;
            payloadData.shipping_cost = 0;
        }

        return payloadData;
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

        // UPDATED ALAMAT VALIDATION
        const shippingOpt = selectedShipping ? shippingOptions.find(s => s.id === selectedShipping) : null;
        const shippingNeedsLocation = shippingOpt && shippingOpt.calculation_type === 'distance';
        const customerHasCoords = selectedCustomer.latitude != null && selectedCustomer.longitude != null;

        if (butuhAlamat) {
            if (useExistingAddress && selectedCustomer.alamat) {
                // OK - pakai alamat existing
            } else if (!useExistingAddress && shippingLocation?.address) {
                // OK - sudah pilih lokasi baru
            } else {
                toast.error('Tentukan lokasi pengiriman terlebih dahulu!');
                return false;
            }
        } else if (shippingNeedsLocation && selectedCustomer.alamat && !customerHasCoords) {
            // Alamat ada tapi koordinat belum → user wajib pilih lokasi di peta
            if (!shippingLocation?.address) {
                toast.error('Tentukan lokasi di peta untuk menghitung ongkir (alamat terdaftar belum punya koordinat).');
                return false;
            }
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
                                                <p className="font-bold text-gray-900 dark:text-gray-100">{userOutlet?.nama || 'Global'}</p>
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
                                <div className="space-y-4">
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
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                        <User className="h-4 w-4" />
                                        <p className="text-xs font-medium">Memproses transaksi sebagai <strong>{userName}</strong> (Admin/Owner Mode)</p>
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
                                                <Label htmlFor="tgl">Tanggal & Waktu Transaksi *</Label>
                                                <Input id="tgl" type="datetime-local" value={data.tgl} onChange={(e) => setData('tgl', e.target.value)} />
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
                                                                                {paket.nama_paket} - {formatRupiah(paket.harga)}/{paket.satuan}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label>Qty ({selectedPaket?.satuan || 'kg'}) *</Label>
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

                                {selectedCustomer && (
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
                                                    disabled={shippingOptions.length === 0}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={shippingOptions.length === 0 ? 'Tidak ada opsi pengiriman' : 'Tidak ada pengiriman'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Tidak ada pengiriman (Ambil Sendiri)</SelectItem>
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
                                                    {shippingOptions.length === 0
                                                        ? 'Tambah opsi pengiriman di Master Data → Biaya Tambahan (tipe pengiriman).'
                                                        : selectedShipping && shippingOptions.find(s => s.id === selectedShipping)?.calculation_type === 'distance'
                                                            ? selectedCustomer.alamat
                                                                ? '✓ Customer sudah punya alamat terdaftar'
                                                                : '⚠️ Alamat perlu ditentukan'
                                                            : selectedShipping
                                                                ? 'Biaya tetap tanpa perhitungan jarak'
                                                                : 'Pilih opsi pengiriman untuk menambah ongkir'
                                                    }
                                                </p>
                                            </div>

                                            {/* ADDRESS MANAGEMENT - Only show if distance-based shipping selected */}
                                            {selectedShipping && shippingOptions.find(s => s.id === selectedShipping)?.calculation_type === 'distance' && (
                                                <>
                                                    <Separator />

                                                    {/* ═══ NO ADDRESS WARNING ═══ */}
                                                    {!data.alamat_lengkap && !isEditingAddress && (
                                                        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
                                                            <AlertCircle className="h-5 w-5 text-amber-600" />
                                                            <AlertDescription>
                                                                <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                                                                    Alamat pengiriman belum tersedia
                                                                </p>
                                                                <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                                                                    Customer <strong>{selectedCustomer.nama}</strong> belum memiliki alamat atau lokasi belum dipilih.
                                                                </p>
                                                                <Button
                                                                    type="button"
                                                                    onClick={handleChangeAddress}
                                                                    size="sm"
                                                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                                                >
                                                                    <MapPin className="h-4 w-4 mr-2" />
                                                                    Tentukan Lokasi Pengiriman
                                                                </Button>
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    {/* ═══ MAP SECTION - Show when editing ═══ */}
                                                    {(showMap || isEditingAddress) && (
                                                        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border-2 border-blue-200">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <Label className="text-base font-semibold flex items-center gap-2">
                                                                        <MapPin className="h-4 w-4 text-blue-600" />
                                                                        {selectedCustomer.alamat ? 'Pilih Lokasi Baru' : 'Tentukan Lokasi Pengantaran'}
                                                                    </Label>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {selectedCustomer.alamat
                                                                            ? 'Lokasi baru akan mengganti alamat yang terdaftar'
                                                                            : 'Klik pada peta atau cari alamat untuk menentukan lokasi'
                                                                        }
                                                                    </p>
                                                                </div>
                                                                {calculatingShipping && (
                                                                    <div className="flex items-center gap-2 text-blue-600">
                                                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                                        <span className="text-xs font-medium">Menghitung...</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Map Component */}
                                                            <div className="rounded-lg overflow-hidden border-2 border-blue-300">
                                                                <LocationPicker
                                                                    initialLat={shippingLocation?.lat || data.customer_lat || -6.2088}
                                                                    initialLng={shippingLocation?.lng || data.customer_lng || 106.8456}
                                                                    onLocationChange={(location) => {
                                                                        setShippingLocation(location);
                                                                        calculateAutoShipping(location.lat, location.lng);
                                                                    }}
                                                                    height="350px"
                                                                />
                                                            </div>

                                                            {/* Selected Address Display (Preview in Map Mode) */}
                                                            {shippingLocation && (
                                                                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                                                    <div className="flex items-start gap-3">
                                                                        <MapPin className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                                Lokasi yang Dipilih:
                                                                            </p>
                                                                            <p className="text-sm text-gray-900 dark:text-gray-100 break-words leading-relaxed">
                                                                                {shippingLocation.address}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Calculation Result */}
                                                            {!calculatingShipping && autoDistance > 0 && (
                                                                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border-2 border-green-300 dark:border-green-800">
                                                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                                                        <div>
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                                                                                Jarak dari Outlet
                                                                            </p>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <span className="text-3xl font-bold text-green-600">
                                                                                    {autoDistance}
                                                                                </span>
                                                                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                                                    km
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                                                                                Biaya Ongkir
                                                                            </p>
                                                                            <div className="text-2xl font-bold text-orange-600">
                                                                                {formatRupiah(autoCost)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 pt-3 border-t border-green-200 dark:border-green-800">
                                                                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                                                            Jarak dan ongkir dihitung otomatis dari lokasi outlet
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action Buttons */}
                                                            {(isEditingAddress || (!data.alamat_lengkap && showMap)) && (
                                                                <div className="flex gap-2 pt-2">
                                                                    {selectedCustomer.alamat && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            onClick={handleCancelEditAddress}
                                                                            className="flex-1"
                                                                        >
                                                                            <X className="h-4 w-4 mr-2" />
                                                                            Batal
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        type="button"
                                                                        onClick={handleConfirmNewAddress}
                                                                        disabled={!shippingLocation?.address || calculatingShipping}
                                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                                    >
                                                                        <Check className="h-4 w-4 mr-2" />
                                                                        {selectedCustomer.alamat ? 'Ganti ke Lokasi Ini' : 'Konfirmasi Lokasi'}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ═══ UNIFIED ADDRESS DISPLAY (READ ONLY) ═══ */}
                                                    {!isEditingAddress && data.alamat_lengkap && (
                                                        <div className={`p-4 rounded-lg border-2 ${useExistingAddress ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-blue-50 border-blue-300 dark:bg-blue-900/10 dark:border-blue-800'}`}>
                                                            <div className="flex items-start gap-3">
                                                                <div className={`p-2 rounded-lg ${useExistingAddress ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                                                                    {useExistingAddress ? (
                                                                        <MapPin className="h-5 w-5 text-green-600" />
                                                                    ) : (
                                                                        <Check className="h-5 w-5 text-blue-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className={`text-xs font-semibold ${useExistingAddress ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`}>
                                                                            LOKASI PENGIRIMAN
                                                                        </p>
                                                                        <Badge variant="outline" className={`${useExistingAddress ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'} text-[10px] px-1.5 py-0`}>
                                                                            {useExistingAddress ? 'Alamat Terdaftar' : 'Lokasi Baru'}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-gray-900 dark:text-gray-100 break-words mb-2 leading-relaxed">
                                                                        {data.alamat_lengkap}
                                                                    </p>
                                                                    <div className={`flex items-center gap-4 text-xs ${useExistingAddress ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'} mb-3`}>
                                                                        <span className="font-medium">📏 Jarak: {data.distance_km || autoDistance || 0} km</span>
                                                                        <span className="font-medium">💰 Ongkir: {formatRupiah(data.shipping_cost || calculation.shipping_cost || 0)}</span>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={handleChangeAddress}
                                                                        className={`text-xs ${useExistingAddress ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'} px-2 py-1 h-auto`}
                                                                    >
                                                                        ✏️ {useExistingAddress ? 'Ganti Lokasi' : 'Ubah Lokasi'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ═══ PATOKAN / CATATAN LOKASI ═══ */}
                                                    {!isEditingAddress && data.alamat_lengkap && (
                                                        <div className="mt-4">
                                                            <Label htmlFor="catatan_lokasi">Patokan / Catatan Lokasi (Opsional)</Label>
                                                            <Input
                                                                id="catatan_lokasi"
                                                                placeholder="Contoh: Pagar hitam, samping warung makan..."
                                                                value={data.catatan_lokasi}
                                                                onChange={(e) => setData('catatan_lokasi', e.target.value)}
                                                                className="mt-1"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Bantu kurir menemukan lokasi dengan lebih mudah.
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* ═══ Non-distance shipping summary ═══ */}
                                            {selectedShipping &&
                                                shippingOptions.find(s => s.id === selectedShipping)?.calculation_type !== 'distance' &&
                                                calculation.shipping_cost > 0 && (
                                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border-2 border-orange-200">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Biaya Ongkir</p>
                                                                <p className="text-sm font-medium text-gray-700">
                                                                    {shippingOptions.find(s => s.id === selectedShipping)?.nama}
                                                                </p>
                                                            </div>
                                                            <span className="text-2xl font-bold text-orange-600">
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
                                            Diskon &amp; Poin
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* AUTO PROMO SECTION */}
                                        <div>
                                            <div>
                                                <Label className="text-base font-semibold mb-3 block">
                                                    Promo Otomatis
                                                </Label>

                                                {(() => {
                                                    const promoInfo = getPromoInfo();

                                                    if (!selectedCustomer) {
                                                        return (
                                                            <Alert className="border-gray-300 bg-gray-50 dark:bg-gray-900/10">
                                                                <AlertCircle className="h-4 w-4 text-gray-500" />
                                                                <AlertDescription className="text-gray-600 dark:text-gray-400">
                                                                    Pilih customer terlebih dahulu untuk melihat promo yang tersedia
                                                                </AlertDescription>
                                                            </Alert>
                                                        );
                                                    }

                                                    if (!promoInfo.hasEligible) {
                                                        return (
                                                            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
                                                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                                                <AlertDescription>
                                                                    <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">
                                                                        Tidak ada promo yang memenuhi syarat
                                                                    </p>
                                                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                                                        {!selectedCustomer.is_member && promos.some(p => p.syarat_member_only && p.is_active) && (
                                                                            <span>💡 Upgrade ke Member untuk mendapat akses promo eksklusif!</span>
                                                                        )}
                                                                        {calculation.base_for_discount === 0 && (
                                                                            <span>Tambahkan item untuk mengecek promo yang tersedia</span>
                                                                        )}
                                                                    </p>
                                                                </AlertDescription>
                                                            </Alert>
                                                        );
                                                    }

                                                    // Show ALL applied promos
                                                    return (
                                                        <div className="space-y-3">
                                                            <Alert className="border-green-300 bg-green-50 dark:bg-green-900/10">
                                                                <Check className="h-4 w-4 text-green-600" />
                                                                <AlertDescription>
                                                                    <p className="font-medium text-green-900 dark:text-green-200 mb-1">
                                                                        {calculation.applied_promos?.length || 0} Promo Diterapkan Otomatis
                                                                    </p>
                                                                    <p className="text-xs text-green-800 dark:text-green-300">
                                                                        Sistem otomatis memilih semua promo yang berlaku
                                                                    </p>
                                                                </AlertDescription>
                                                            </Alert>

                                                            {/* List all applied promos */}
                                                            {calculation.applied_promos && calculation.applied_promos.length > 0 && (
                                                                <div className="space-y-2">
                                                                    {calculation.applied_promos.map((promo, index) => (
                                                                        <div
                                                                            key={promo.id}
                                                                            className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800"
                                                                        >
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <div className="flex items-start gap-2 flex-1">
                                                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                                                                                        {index + 1}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <Check className="h-4 w-4 text-green-600" />
                                                                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                                                                {promo.nama}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                                                            <span>
                                                                                                Diskon: {promo.jenis === 'percent' ? `${promo.nilai}%` : formatRupiah(promo.nilai)}
                                                                                            </span>
                                                                                            {promo.is_member_only && (
                                                                                                <>
                                                                                                    <span>•</span>
                                                                                                    <Badge variant="outline" className="border-orange-400 text-orange-600 text-[10px] px-1.5 py-0">
                                                                                                        <Crown className="h-2.5 w-2.5 mr-1" />
                                                                                                        Member
                                                                                                    </Badge>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-xs text-gray-500 mb-0.5">Hemat</p>
                                                                                    <p className="text-lg font-bold text-green-600">
                                                                                        {formatRupiah(promo.amount)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Show available but not applied promos (if any) */}
                                                            {promoInfo.promos.length > (calculation.applied_promos?.length || 0) && (
                                                                <details className="text-xs text-gray-500">
                                                                    <summary className="cursor-pointer hover:text-gray-700">
                                                                        Lihat {promoInfo.promos.length - (calculation.applied_promos?.length || 0)} promo lainnya yang tersedia
                                                                    </summary>
                                                                    <div className="mt-2 space-y-1">
                                                                        {promoInfo.promos
                                                                            .filter(p => !calculation.applied_promos?.some(ap => ap.id === p.id))
                                                                            .map(promo => (
                                                                                <div key={promo.id} className="p-2 bg-gray-50 rounded text-xs">
                                                                                    {promo.nama_promo} - {promo.jenis === 'percent' ? `${promo.diskon}%` : formatRupiah(promo.diskon)}
                                                                                    {promo.minimal_transaksi && ` (Min. ${formatRupiah(promo.minimal_transaksi)})`}
                                                                                </div>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                </details>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <p className="text-xs text-center text-gray-500 mt-2">
                                                    <AlertCircle className="h-3 w-3 inline mr-1" />
                                                    Sistem otomatis memilih semua diskon yang tersedia (kecuali point yang tetap ditukar manual)
                                                </p>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Points redemption (TETAP MANUAL) */}
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

                                                {/* Shipping Summary - selalu tampil agar section ongkir tidak "hilang" */}
                                                <Separator />
                                                <div className="flex justify-between text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <Truck className="h-3 w-3" />
                                                        Ongkir{autoDistance > 0 && ` (${autoDistance} km)`}:
                                                    </span>
                                                    <span className={`font-medium ${calculation.shipping_cost > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                                                        {calculation.shipping_cost > 0
                                                            ? `+ ${formatRupiah(calculation.shipping_cost)}`
                                                            : 'Rp 0'}
                                                    </span>
                                                </div>
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