<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // A. Stored Procedure: sp_input_transaksi
        DB::unprepared('
            CREATE OR REPLACE FUNCTION sp_input_transaksi(
                p_id_outlet BIGINT,
                p_kode_invoice VARCHAR,
                p_id_member BIGINT,
                p_tgl TIMESTAMP,
                p_batas_waktu TIMESTAMP,
                p_tgl_bayar TIMESTAMP,
                p_biaya_tambahan DECIMAL(15,2),
                p_diskon DECIMAL(15,2),
                p_pajak DECIMAL(15,2),
                p_status VARCHAR(50),
                p_dibayar VARCHAR(50),
                p_id_user BIGINT
            ) RETURNS BIGINT AS $$
            DECLARE
                v_transaksi_id BIGINT;
            BEGIN
                INSERT INTO transaksis (
                    id_outlet,
                    kode_invoice,
                    id_member,
                    tgl,
                    batas_waktu,
                    tgl_bayar,
                    biaya_tambahan,
                    diskon,
                    pajak,
                    status,
                    dibayar,
                    id_user,
                    created_at,
                    updated_at
                ) VALUES (
                    p_id_outlet,
                    p_kode_invoice,
                    p_id_member,
                    p_tgl,
                    p_batas_waktu,
                    p_tgl_bayar,
                    p_biaya_tambahan,
                    p_diskon,
                    p_pajak,
                    p_status,
                    p_dibayar,
                    p_id_user,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_transaksi_id;
                
                RETURN v_transaksi_id;
            END;
            $$ LANGUAGE plpgsql;
        ');

        // B. Trigger Function untuk logging
        DB::unprepared('
            CREATE OR REPLACE FUNCTION fn_log_transaksi()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = \'INSERT\') THEN
                    INSERT INTO logs (id_user, aksi, keterangan, created_at)
                    VALUES (
                        NEW.id_user,
                        \'INSERT TRANSAKSI\',
                        \'Invoice: \' || NEW.kode_invoice || \', Status: \' || NEW.status || \', Dibayar: \' || NEW.dibayar,
                        NOW()
                    );
                    RETURN NEW;
                ELSIF (TG_OP = \'UPDATE\') THEN
                    INSERT INTO logs (id_user, aksi, keterangan, created_at)
                    VALUES (
                        NEW.id_user,
                        \'UPDATE TRANSAKSI\',
                        \'Invoice: \' || NEW.kode_invoice || 
                        \', Status: \' || OLD.status || \' -> \' || NEW.status ||
                        \', Dibayar: \' || OLD.dibayar || \' -> \' || NEW.dibayar,
                        NOW()
                    );
                    RETURN NEW;
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        ');

        // C. Database Trigger: tr_log_transaksi
        DB::unprepared('
            CREATE TRIGGER tr_log_transaksi
            AFTER INSERT OR UPDATE ON transaksis
            FOR EACH ROW
            EXECUTE FUNCTION fn_log_transaksi();
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS tr_log_transaksi ON transaksis;');
        DB::unprepared('DROP FUNCTION IF EXISTS fn_log_transaksi();');
        DB::unprepared('DROP FUNCTION IF EXISTS sp_input_transaksi(BIGINT, VARCHAR, BIGINT, TIMESTAMP, TIMESTAMP, TIMESTAMP, DECIMAL, DECIMAL, DECIMAL, VARCHAR, VARCHAR, BIGINT);');
    }
};