<?php

namespace App\Exports;

use App\Models\Transaksi;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Carbon\Carbon;

class TransaksiExport implements 
    FromCollection, 
    WithMapping, 
    WithStyles, 
    WithColumnWidths, 
    WithTitle,
    WithEvents
{
    protected $transactions;
    protected $filters;
    protected $summary;

    public function __construct($transactions, $filters, $summary)
    {
        $this->transactions = $transactions;
        $this->filters = $filters;
        $this->summary = $summary;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return $this->transactions;
    }

    /**
     * Map each transaction to a row
     */
    public function map($transaction): array
    {
        static $rowNumber = 0;
        $rowNumber++;

        return [
            $rowNumber,
            $transaction->kode_invoice,
            Carbon::parse($transaction->tgl)->format('d/m/Y H:i'),
            $transaction->customer ? $transaction->customer->nama : '-',
            $transaction->outlet ? $transaction->outlet->nama : '-',
            $this->formatStatus($transaction->status),
            $this->formatPaymentStatus($transaction->dibayar),
            (float) $transaction->total_akhir,
        ];
    }

    /**
     * Format status for display
     */
    private function formatStatus($status): string
    {
        return match($status) {
            'baru' => 'Baru',
            'proses' => 'Proses',
            'selesai' => 'Selesai',
            'diambil' => 'Diambil',
            'dikirim' => 'Dikirim',
            'diterima' => 'Diterima',
            'batal' => 'Batal',
            default => $status,
        };
    }

    /**
     * Format payment status
     */
    private function formatPaymentStatus($dibayar): string
    {
        return $dibayar === 'dibayar' ? 'Lunas' : 'Belum Lunas';
    }

    /**
     * Define column widths
     */
    public function columnWidths(): array
    {
        return [
            'A' => 6,   // No
            'B' => 20,  // Kode Invoice
            'C' => 18,  // Tanggal
            'D' => 25,  // Customer
            'E' => 20,  // Outlet
            'F' => 12,  // Status
            'G' => 15,  // Pembayaran
            'H' => 18,  // Total
        ];
    }

    /**
     * Apply styles to the worksheet
     */
    public function styles(Worksheet $sheet)
    {
        return [];
    }

    /**
     * Sheet title
     */
    public function title(): string
    {
        return 'Laporan Transaksi';
    }

    /**
     * Register events for advanced formatting
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                
                // Insert 6 blank rows at the top for header
                $sheet->insertNewRowBefore(1, 6);
                
                // Company Header - Row 1
                $sheet->mergeCells('A1:H1');
                $sheet->setCellValue('A1', 'LAPORAN TRANSAKSI LAUNDRY');
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 16,
                        'color' => ['rgb' => '1F4E78'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(30);

                // Filter Information
                $dateFrom = $this->filters['date_from'] ?? '-';
                $dateTo = $this->filters['date_to'] ?? '-';
                $outletName = $this->filters['outlet_name'] ?? 'Semua Outlet';

                // Row 3: Periode
                $sheet->mergeCells('A3:H3');
                $sheet->setCellValue('A3', "Periode: {$dateFrom} s/d {$dateTo}");
                $sheet->getStyle('A3')->applyFromArray([
                    'font' => ['size' => 10],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Row 4: Outlet
                $sheet->mergeCells('A4:H4');
                $sheet->setCellValue('A4', "Outlet: {$outletName}");
                $sheet->getStyle('A4')->applyFromArray([
                    'font' => ['size' => 10],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Row 5: Dicetak
                $sheet->mergeCells('A5:H5');
                $sheet->setCellValue('A5', "Dicetak: " . Carbon::now()->format('d/m/Y H:i:s'));
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['size' => 9, 'italic' => true],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Row 7: Table Headers
                $headers = ['No', 'Kode Invoice', 'Tanggal', 'Customer', 'Outlet', 'Status', 'Pembayaran', 'Total (Rp)'];
                foreach ($headers as $index => $header) {
                    $column = chr(65 + $index); // A, B, C, etc.
                    $sheet->setCellValue("{$column}7", $header);
                }

                // Style table headers
                $sheet->getStyle('A7:H7')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['rgb' => 'FFFFFF'],
                        'size' => 11,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '4472C4'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => '000000'],
                        ],
                    ],
                ]);

                // Data rows styling (starting from row 8)
                $lastRow = $sheet->getHighestRow();
                $dataRange = "A8:H{$lastRow}";
                
                // Apply borders to all data cells
                $sheet->getStyle($dataRange)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'CCCCCC'],
                        ],
                    ],
                ]);

                // Align columns
                $sheet->getStyle("A8:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER); // No
                $sheet->getStyle("B8:B{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);   // Invoice
                $sheet->getStyle("C8:C{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER); // Tanggal
                $sheet->getStyle("D8:D{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);   // Customer
                $sheet->getStyle("E8:E{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);   // Outlet
                $sheet->getStyle("F8:F{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER); // Status
                $sheet->getStyle("G8:G{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER); // Pembayaran
                $sheet->getStyle("H8:H{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);  // Total

                // Format currency column
                $sheet->getStyle("H8:H{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');

                // Summary Section - TOTAL KESELURUHAN
                $summaryRow = $lastRow + 2;
                $sheet->mergeCells("A{$summaryRow}:G{$summaryRow}");
                $sheet->setCellValue("A{$summaryRow}", 'TOTAL KESELURUHAN');
                $sheet->setCellValue("H{$summaryRow}", $this->summary['total_omzet']);
                
                $sheet->getStyle("A{$summaryRow}:H{$summaryRow}")->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 12,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '70AD47'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_RIGHT,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_MEDIUM,
                            'color' => ['rgb' => '000000'],
                        ],
                    ],
                ]);
                $sheet->getStyle("H{$summaryRow}")->getNumberFormat()->setFormatCode('#,##0');

                // Additional summary info
                $infoRow = $summaryRow + 2;
                $sheet->setCellValue("A{$infoRow}", 'Total Transaksi:');
                $sheet->setCellValue("B{$infoRow}", $this->summary['total_transaksi']);
                $sheet->setCellValue("D{$infoRow}", 'Lunas:');
                $sheet->setCellValue("E{$infoRow}", $this->summary['total_lunas']);
                $sheet->setCellValue("F{$infoRow}", 'Belum Lunas:');
                $sheet->setCellValue("G{$infoRow}", $this->summary['total_belum_lunas']);
                
                $sheet->getStyle("A{$infoRow}:G{$infoRow}")->applyFromArray([
                    'font' => ['bold' => true, 'size' => 10],
                ]);
            },
        ];
    }
}
