import { query, withTransaction } from '../db.js';

const BASE = `
  SELECT u.id, u.email, u.password_hash, u.is_active, u.created_at, r.name AS role,
         p.full_name, p.phone, p.address
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN customer_profiles p ON p.user_id = u.id`;

export const toUser = (row) =>
  row && {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
  };

export async function findById(id) {
  const { rows } = await query(`${BASE} WHERE u.id = $1`, [id]);
  return toUser(rows[0]);
}

/** Mengembalikan pengguna beserta passwordHash (hanya untuk proses login). */
export async function findForLogin(email) {
  const { rows } = await query(`${BASE} WHERE lower(u.email) = lower($1)`, [email]);
  return rows[0] && { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function emailExists(email, exceptId = null) {
  const { rowCount } = await query('SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> COALESCE($2, -1)', [email, exceptId]);
  return rowCount > 0;
}

/** Membuat akun dengan peran CUSTOMER beserta profilnya dalam satu transaksi. */
export function createCustomer({ email, passwordHash, fullName, phone = '', address = '' }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'CUSTOMER')) RETURNING id`,
      [email, passwordHash],
    );
    await client.query('INSERT INTO customer_profiles (user_id, full_name, phone, address) VALUES ($1, $2, $3, $4)', [rows[0].id, fullName, phone, address]);
    return rows[0].id;
  });
}
