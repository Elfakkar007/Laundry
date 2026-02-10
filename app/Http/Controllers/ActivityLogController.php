<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use Inertia\Inertia;
use Inertia\Response;
use App\Traits\HasAuthorization;

class ActivityLogController extends Controller
{
    use HasAuthorization;

    /**
     * Display activity logs with filtering
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission('activity-log.view');

        $user = $request->user();
        $search = $request->input('search');
        $logName = $request->input('log_name');
        $subjectType = $request->input('subject_type');
        $causerId = $request->input('causer_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $logsQuery = Activity::query()
            ->with(['causer', 'subject'])
            ->latest();

        // Filters
        if ($search) {
            $logsQuery->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('log_name', 'like', "%{$search}%")
                  ->orWhereHas('causer', function ($q) use ($search) {
                      $q->where('nama', 'like', "%{$search}%");
                  });
            });
        }

        if ($logName && $logName !== 'all') {
            $logsQuery->where('log_name', $logName);
        }

        if ($subjectType && $subjectType !== 'all') {
            $logsQuery->where('subject_type', $subjectType);
        }

        if ($causerId && $causerId !== 'all') {
            $logsQuery->where('causer_id', $causerId);
        }

        if ($dateFrom) {
            $logsQuery->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $logsQuery->whereDate('created_at', '<=', $dateTo);
        }

        $logs = $logsQuery->paginate(20)->withQueryString();

        // Get unique subject types for filter
        $subjectTypes = Activity::select('subject_type')
            ->distinct()
            ->pluck('subject_type')
            ->map(function ($type) {
                return [
                    'value' => $type,
                    'label' => class_basename($type)
                ];
            });

        // Get users who have performed actions
        $causers = Activity::with('causer')
            ->select('causer_id')
            ->distinct()
            ->get()
            ->pluck('causer')
            ->filter()
            ->map(function ($user) {
                return [
                    'value' => $user->id,
                    'label' => $user->nama
                ];
            });

        return Inertia::render('ActivityLog/Index', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'log_name', 'subject_type', 'causer_id', 'date_from', 'date_to']),
            'subjectTypes' => $subjectTypes,
            'causers' => $causers,
        ]);
    }

    /**
     * Export logs to CSV
     */
    public function export(Request $request)
    {
        $this->authorizePermission('activity-log.view');

        // Similar query as index but without pagination
        $logs = Activity::with(['causer', 'subject'])
            ->latest()
            ->get();

        $filename = 'activity_logs_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($logs) {
            $file = fopen('php://output', 'w');
            
            // Header
            fputcsv($file, ['Timestamp', 'User', 'Action', 'Model', 'Description', 'IP Address']);

            // Data
            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->causer?->nama ?? 'System',
                    $log->description,
                    class_basename($log->subject_type),
                    $log->log_name,
                    $log->properties->get('ip') ?? 'N/A',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
