import { query } from '../db.js';

/**
 * Sumber data tunggal untuk laporan di layar, CSV, dan PDF.
 * Hanya penjualan berstatus PAID. Rentang tanggal memakai zona waktu Asia/Jakarta.
 */
export async function salesRows({ from, to }) {
  const { rows } = await query(
    `SELECT s.id, s.invoice_no, s.paid_at, s.customer_name, s.customer_email,
            si.song_title, si.artist_name, si.price
     FROM sales s JOIN sale_items si ON si.sale_id = s.id
     WHERE s.status = 'PAID'
       AND ($1::date IS NULL OR (s.paid_at AT TIME ZONE 'Asia/Jakarta')::date >= $1::date)
       AND ($2::date IS NULL OR (s.paid_at AT TIME ZONE 'Asia/Jakarta')::date <= $2::date)
     ORDER BY s.paid_at DESC, si.id DESC`,
    [from || null, to || null],
  );
  return rows.map((r) => ({
    id: r.id,
    invoiceNo: r.invoice_no,
    paidAt: r.paid_at,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    songTitle: r.song_title,
    artistName: r.artist_name,
    price: r.price,
  }));
}

export async function stats() {
  const { rows } = await query(
    `SELECT
       (SELECT count(*) FROM songs)::int AS songs,
       (SELECT count(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'CUSTOMER')::int AS customers,
       (SELECT count(*) FROM sales WHERE status = 'PAID')::int AS sales,
       (SELECT COALESCE(sum(total), 0) FROM sales WHERE status = 'PAID')::int AS revenue`,
  );
  return rows[0];
}
