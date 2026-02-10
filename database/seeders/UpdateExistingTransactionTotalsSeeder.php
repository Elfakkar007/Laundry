<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateExistingTransactionTotalsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder calculates and updates total_akhir for existing transactions
     * Formula: total_akhir = (sum of detail items) + biaya_tambahan + shipping_cost - diskon + pajak
     */
    public function run(): void
    {
        $transactions = DB::table('transaksis')->get();
        
        foreach ($transactions as $transaction) {
            // Calculate subtotal from detail items
            $subtotal = DB::table('detail_transaksis')
                ->where('id_transaksi', $transaction->id)
                ->sum(DB::raw('qty * harga'));
            
            // Calculate total_akhir
            $total_akhir = $subtotal 
                + ($transaction->biaya_tambahan ?? 0)
                + ($transaction->shipping_cost ?? 0)
                - ($transaction->diskon ?? 0)
                + ($transaction->pajak ?? 0);
            
            // Update the transaction
            DB::table('transaksis')
                ->where('id', $transaction->id)
                ->update(['total_akhir' => $total_akhir]);
        }
        
        $this->command->info('Updated total_akhir for ' . $transactions->count() . ' transactions.');
    }
}
