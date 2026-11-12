import { query } from '../db.js';

const SALE_SELECT = `
  SELECT s.id, s.invoice_no, s.user_id, s.total, s.status, s.payment_ref, s.created_at, s.paid_at,
         si.song_id, si.song_title, si.artist_name, si.price
  FROM sales s JOIN sale_items si ON si.sale_id = s.id`;

export const toSale = (r) =>
  r && {
    id: r.id,
    invoiceNo: r.invoice_no,
    userId: r.user_id,
    total: r.total,
    status: r.status,
    paymentRef: r.payment_ref,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    songId: r.song_id,
    songTitle: r.song_title,
    artistName: r.artist_name,
    price: r.price,
  };

/** Kunci per-pengguna agar dua permintaan bersamaan tidak membuat pesanan ganda. */
export const lockUser = (client, userId) => client.query('SELECT pg_advisory_xact_lock($1)', [userId]);

export async function ownsSong(userId, songId, db) {
  const { rowCount } = await query(
    `SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE s.user_id = $1 AND si.song_id = $2 AND s.status = 'PAID'`,
    [userId, songId],
    db,
  );
  return rowCount > 0;
}

export async function findPending(userId, songId, db) {
  const { rows } = await query(
    `${SALE_SELECT} WHERE s.user_id = $1 AND si.song_id = $2 AND s.status = 'PENDING' ORDER BY s.id DESC LIMIT 1`,
    [userId, songId],
    db,
  );
  return toSale(rows[0]);
}

export async function createSale(client, { user, song, invoiceNo, paymentRef }) {
  const { rows } = await client.query(
    `INSERT INTO sales (invoice_no, user_id, customer_name, customer_email, total, status, payment_ref)
     VALUES ($1,$2,$3,$4,$5,'PENDING',$6) RETURNING id`,
    [invoiceNo, user.id, user.fullName || user.email, user.email, song.price, paymentRef],
  );
  await client.query(
    'INSERT INTO sale_items (sale_id, song_id, song_title, artist_name, price) VALUES ($1,$2,$3,$4,$5)',
    [rows[0].id, song.id, song.title, song.artist, song.price],
  );
  return rows[0].id;
}

export async function findByIdForUpdate(client, id) {
  const { rows } = await client.query(`${SALE_SELECT} WHERE s.id = $1 FOR UPDATE OF s`, [id]);
  return toSale(rows[0]);
}

export async function findById(id, db) {
  const { rows } = await query(`${SALE_SELECT} WHERE s.id = $1`, [id], db);
  return toSale(rows[0]);
}

export async function setStatus(client, id, status) {
  await client.query(
    `UPDATE sales SET status = $2::varchar, paid_at = CASE WHEN $2::varchar = 'PAID' THEN now() ELSE paid_at END WHERE id = $1`,
    [id, status],
  );
}

export async function listByUser(userId) {
  const { rows } = await query(`${SALE_SELECT} WHERE s.user_id = $1 ORDER BY s.created_at DESC, s.id DESC`, [userId]);
  return rows.map(toSale);
}

/** Pustaka: lagu yang sudah dibayar milik pengguna. */
export async function library(userId) {
  const { rows } = await query(
    `SELECT s.id, s.title, s.price, s.duration_sec, s.release_year, s.cover_color, s.lyrics, s.audio_file, s.preview_file,
            g.name AS genre, a.name AS artist, c.name AS composer, l.name AS label, MAX(sa.paid_at) AS purchased_at
     FROM sales sa
     JOIN sale_items si ON si.sale_id = sa.id
     JOIN songs s ON s.id = si.song_id
     JOIN genres g ON g.id = s.genre_id
     JOIN artists a ON a.id = s.artist_id
     JOIN composers c ON c.id = s.composer_id
     JOIN record_labels l ON l.id = s.label_id
     WHERE sa.user_id = $1 AND sa.status = 'PAID'
     GROUP BY s.id, g.name, a.name, c.name, l.name
     ORDER BY MAX(sa.paid_at) DESC`,
    [userId],
  );
  return rows;
}
