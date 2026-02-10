import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { toast } from 'sonner';
import {
    Shield, Search, Download, Calendar, User, Activity,
    FileText, Eye, AlertCircle
} from 'lucide-react';

export default function ActivityLogIndex({ logs, filters, subjectTypes, causers, flash }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [logName, setLogName] = useState(filters.log_name || 'all');
    const [subjectType, setSubjectType] = useState(filters.subject_type || 'all');
    const [causerId, setCauserId] = useState(filters.causer_id || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('activity-log.index'), {
            search: searchTerm,
            log_name: logName,
            subject_type: subjectType,
            causer_id: causerId,
            date_from: dateFrom,
            date_to: dateTo,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleExport = () => {
        window.location.href = route('activity-log.export');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionBadge = (description) => {
        const variants = {
            created: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            deleted: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        };

        let variant = 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        if (description.includes('created')) variant = variants.created;
        else if (description.includes('updated')) variant = variants.updated;
        else if (description.includes('deleted')) variant = variants.deleted;

        return (
            <Badge variant="outline" className={`${variant} flex items-center gap-1 w-fit`}>
                <Activity className="h-3 w-3" />
                {description}
            </Badge>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6" />
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                                Activity Log
                            </h2>
                            <p className="text-sm text-gray-500">Audit trail sistem untuk keamanan</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total: {logs.total} aktivitas
                    </div>
                </div>
            }
        >
            <Head title="Activity Log" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="p-6">
                            {/* Security Notice */}
                            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        <span className="font-semibold">Keamanan Sistem: </span>
                                        Log ini tidak dapat diedit atau dihapus. Semua aktivitas penting tercatat secara otomatis.
                                    </p>
                                </div>
                            </div>

                            {/* Filters */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="text-base">Filter & Pencarian</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSearch} className="space-y-4">
                                        {/* Search & Export */}
                                        <div className="flex gap-2">
                                            <Input
                                                type="text"
                                                placeholder="Cari aktivitas..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="flex-1"
                                                icon={<Search className="h-4 w-4" />}
                                            />
                                            <Button type="submit" variant="default">
                                                <Search className="h-4 w-4 mr-2" />
                                                Cari
                                            </Button>
                                            <Button type="button" variant="outline" onClick={handleExport}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Export CSV
                                            </Button>
                                        </div>

                                        {/* Filter Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            {/* Model Type */}
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Model</label>
                                                <Select value={subjectType} onValueChange={setSubjectType}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Semua Model" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Semua Model</SelectItem>
                                                        {subjectTypes.map((type) => (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                {type.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* User Filter */}
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">User</label>
                                                <Select value={causerId} onValueChange={setCauserId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Semua User" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Semua User</SelectItem>
                                                        {causers.map((causer) => (
                                                            <SelectItem key={causer.value} value={causer.value.toString()}>
                                                                {causer.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Date From */}
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Dari Tanggal</label>
                                                <Input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                />
                                            </div>

                                            {/* Date To */}
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Sampai Tanggal</label>
                                                <Input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Logs Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Aksi</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead>Detail</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                                    Tidak ada log ditemukan
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.data.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-mono text-xs">
                                                        {formatDate(log.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                            <span className="font-medium">
                                                                {log.causer?.nama || 'System'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getActionBadge(log.description)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            {log.subject_type ? log.subject_type.split('\\').pop() : 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedLog(log)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Lihat
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {logs.links && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {logs.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.visit(link.url)}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detail Aktivitas</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Waktu</label>
                                    <p className="font-mono text-sm">{formatDate(selectedLog.created_at)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">User</label>
                                    <p className="font-medium">{selectedLog.causer?.nama || 'System'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Aksi</label>
                                    <p>{selectedLog.description}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Model</label>
                                    <p>{selectedLog.subject_type ? selectedLog.subject_type.split('\\').pop() : 'N/A'}</p>
                                </div>
                            </div>

                            {selectedLog.properties && Object.keys(selectedLog.properties).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-2 block">Perubahan Data</label>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
                                        <pre className="text-xs font-mono whitespace-pre-wrap">
                                            {JSON.stringify(selectedLog.properties, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
