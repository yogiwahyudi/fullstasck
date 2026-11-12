import { query, withTransaction } from '../db.js';
import { toUser } from './user.repository.js';

const BASE = `
  SELECT u.id, u.email, u.is_active, u.created_at, r.name AS role, p.full_name, p.phone, p.address
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN customer_profiles p ON p.user_id = u.id
  WHERE r.name = 'CUSTOMER'`;

export async function list(q) {
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const { rows } = await query(
    `${BASE} AND ($1::text IS NULL OR p.full_name ILIKE $1 OR u.email ILIKE $1) ORDER BY u.id`,
    [like],
  );
  return rows.map(toUser);
}

export async function findById(id) {
  const { rows } = await query(`${BASE} AND u.id = $1`, [id]);
  return toUser(rows[0]);
}

export async function updateProfile(id, { fullName, phone, address }) {
  await query('UPDATE customer_profiles SET full_name = $2, phone = $3, address = $4 WHERE user_id = $1', [id, fullName, phone, address]);
}

/** Pembaruan oleh admin: email, status, kata sandi (opsional) + profil. */
export function adminUpdate(id, { email, isActive, passwordHash, fullName, phone, address }) {
  return withTransaction(async (client) => {
    await client.query(
      'UPDATE users SET email = $2, is_active = $3, password_hash = COALESCE($4, password_hash) WHERE id = $1',
      [id, email, isActive, passwordHash ?? null],
    );
    await client.query('UPDATE customer_profiles SET full_name = $2, phone = $3, address = $4 WHERE user_id = $1', [id, fullName, phone, address]);
  });
}

/** Menghapus pelanggan. sales.user_id menjadi NULL sehingga histori penjualan tetap ada. */
export async function remove(id) {
  await query('DELETE FROM users WHERE id = $1', [id]);
}
