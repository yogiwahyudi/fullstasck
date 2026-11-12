// Helper tes integrasi. Membutuhkan PostgreSQL: set TEST_DATABASE_URL (database akan DI-RESET dari musicpedia.sql!).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_DB = process.env.TEST_DATABASE_URL;
export const skip = TEST_DB ? false : 'TEST_DATABASE_URL tidak diatur - tes integrasi dilewati';

if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const sqlFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'musicpedia.sql');

export async function startServer() {
  const { pool } = await import('../src/db.js');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(fs.readFileSync(sqlFile, 'utf8'));
  const { createApp } = await import('../src/app.js');
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return { base, pool, close: () => new Promise((r) => server.close(async () => { await pool.end(); r(); })) };
}

/** Klien HTTP kecil yang menyimpan cookie sesi. */
export function client(base) {
  let cookie = '';
  async function call(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : type.startsWith('text/') ? await res.text() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  }
  return {
    get: (u) => call('GET', u),
    post: (u, b = {}) => call('POST', u, b),
    put: (u, b) => call('PUT', u, b),
    del: (u) => call('DELETE', u),
    login: async (email, password) => {
      const r = await call('POST', '/auth/login', { email, password });
      if (r.status !== 200) throw new Error('login gagal: ' + JSON.stringify(r.data));
      return r.data.user;
    },
  };
}

export const ADMIN = ['admin@musicpedia.test', 'Admin123!'];
export const RANI = ['rani@musicpedia.test', 'Customer123!'];
export const BUDI = ['budi@musicpedia.test', 'Customer123!'];
