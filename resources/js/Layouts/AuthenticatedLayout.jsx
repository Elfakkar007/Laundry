import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/Components/ui/dropdown-menu';
import { Separator } from '@/Components/ui/separator';
import {
    LayoutDashboard,
    Store,
    Package,
    Users,
    FileText,
    Settings,
    Tag,
    CreditCard,
    UserCog,
    Menu,
    X,
    LogOut,
    ChevronDown,
    Sparkles,
    Clock,
    BarChart3,
    Shield
} from 'lucide-react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date());

    // Jam realtime — update setiap detik
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Get user permissions (dari Spatie Laravel Permission)
    const hasPermission = (permission) => {
        return user.permissions?.includes(permission) || false;
    };

    const hasRole = (role) => {
        return user.roles?.includes(role) || false;
    };

    // Check user role
    const isOwner = hasRole('owner');
    const isKasir = hasRole('kasir');
    const isAdmin = hasRole('admin');

    // Menu items dengan role-based filtering yang lebih ketat
    const menuItems = [
        {
            name: 'Dashboard',
            href: route('dashboard'),
            icon: LayoutDashboard,
            active: route().current('dashboard'),
            show: true, // Semua role bisa lihat dashboard
        },
        // KASIR & ADMIN: Transaksi
        {
            name: 'Transaksi',
            href: route('transaksi.index'),
            icon: FileText,
            active: route().current('transaksi.*'),
            show: isAdmin || (isKasir && (hasPermission('transaksi.view') || hasPermission('transaksi.create'))),
        },
        // OWNER, ADMIN, KASIR: Laporan
        {
            name: 'Laporan',
            href: route('laporan.index'), // route('reports.index'),
            icon: BarChart3,
            active: route().current('laporan.*'),
            show: isOwner || isAdmin || (isKasir && hasPermission('report.view')),
        },
        // ADMIN ONLY: Master Data
        {
            name: 'Master Data',
            icon: Sparkles,
            isGroup: true,
            show: isAdmin, // Admin always sees this group
            items: [
                {
                    name: 'Outlet',
                    href: route('outlets.index'),
                    icon: Store,
                    active: route().current('outlets.*'),
                    show: isAdmin || hasPermission('outlet.view'),
                },
                {
                    name: 'Jenis Paket',
                    href: route('package-types.index'),
                    icon: Package,
                    active: route().current('package-types.*'),
                    show: isAdmin || hasPermission('paket.view'),
                },
                {
                    name: 'Paket Layanan',
                    href: route('pakets.index'),
                    icon: FileText,
                    active: route().current('pakets.*'),
                    show: isAdmin || hasPermission('paket.view'),
                },
                {
                    name: 'Pelanggan',
                    href: route('customers.index'),
                    icon: Users,
                    active: route().current('customers.*'),
                    show: isAdmin || hasPermission('customer.view'),
                },
            ],
        },
        // ADMIN ONLY: Keuangan
        {
            name: 'Keuangan',
            icon: CreditCard,
            isGroup: true,
            show: isAdmin, // Admin always sees this group
            items: [
                {
                    name: 'Biaya Tambahan',
                    href: route('surcharges.index'),
                    icon: CreditCard,
                    active: route().current('surcharges.*'),
                    show: isAdmin || hasPermission('finance.view'),
                },
                {
                    name: 'Promo & Diskon',
                    href: route('promos.index'),
                    icon: Tag,
                    active: route().current('promos.*'),
                    show: isAdmin || hasPermission('finance.view'),
                },
            ],
        },
        // ADMIN ONLY: User Management
        {
            name: 'User Management',
            href: route('users.index'),
            icon: UserCog,
            active: route().current('users.*'),
            show: isAdmin || hasPermission('user.view'),
        },
        // ADMIN ONLY: Pengaturan
        {
            name: 'Pengaturan',
            href: route('settings.index'),
            icon: Settings,
            active: route().current('settings.*'),
            show: isAdmin || hasPermission('setting.view'),
        },
        // ADMIN/OWNER ONLY: Activity Log
        {
            name: 'Activity Log',
            href: route('activity-log.index'),
            icon: Shield,
            active: route().current('activity-log.*'),
            show: isAdmin || isOwner,
        },
    ];

    const NavItem = ({ item }) => {
        if (item.isGroup) {
            return (
                <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </div>
                    </div>
                    {item.items.map((subItem) =>
                        subItem.show && <NavItem key={subItem.name} item={subItem} />
                    )}
                </div>
            );
        }

        return (
            <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
            >
                <item.icon className="h-4 w-4" />
                {item.name}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col print:hidden">
                <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    {/* Logo */}
                    <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-800">
                        <Link href={route('dashboard')} className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                Laundry Pro
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
                        {menuItems.map((item) =>
                            item.show && <NavItem key={item.name} item={item} />
                        )}
                    </nav>

                    {/* User Info */}
                    <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                {user.nama.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user.nama}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user.roles?.[0] || 'User'}
                                    {user.outlet && ` • ${user.outlet.nama}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <div
                className={`fixed inset-0 z-40 md:hidden print:hidden ${sidebarOpen ? 'block' : 'hidden'
                    }`}
            >
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75"
                    onClick={() => setSidebarOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900">
                    {/* Mobile Logo */}
                    <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                        <Link href={route('dashboard')} className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                Laundry Pro
                            </span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
                        {menuItems.map((item) =>
                            item.show && <NavItem key={item.name} item={item} />
                        )}
                    </nav>

                    {/* Mobile User Info */}
                    <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                {user.nama.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user.nama}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user.roles?.[0] || 'User'}
                                    {user.outlet && ` • ${user.outlet.nama}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="md:pl-64 flex flex-col flex-1 print:pl-0">
                {/* Top Navbar */}
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 print:hidden">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        {/* Page Title */}
                        <div className="flex-1">
                            {header && (
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {header}
                                </h1>
                            )}
                        </div>

                        {/* Jam Realtime */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-mono tabular-nums">
                            <Clock className="h-4 w-4" />
                            {currentTime.toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}
                            <span className="text-gray-400 dark:text-gray-500">|</span>
                            {currentTime.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false,
                            })}
                        </div>

                        {/* User Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                                        {user.nama.charAt(0).toUpperCase()}
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div>
                                        <p className="font-medium">{user.nama}</p>
                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {user.roles?.[0]?.toUpperCase() || 'USER'}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full cursor-pointer text-red-600"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}