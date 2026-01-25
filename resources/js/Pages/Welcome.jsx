import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Welcome({ auth }) {
    // Auto redirect ke dashboard jika sudah login, atau ke login jika belum
    useEffect(() => {
        if (auth.user) {
            window.location.href = route('dashboard');
        } else {
            window.location.href = route('login');
        }
    }, [auth.user]);

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Mengalihkan...</p>
                </div>
            </div>
        </>
    );
}