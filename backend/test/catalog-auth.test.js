import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, BUDI, RANI, client, skip, startServer } from './helpers.js';

let srv;
before(async () => { if (!skip) srv = await startServer(); });
after(async () => { await srv?.close(); });

test('Alur 1: katalog publik dapat dibuka tanpa login', { skip }, async () => {
  const c = client(srv.base);
  const r = await c.get('/songs');
  assert.equal(r.status, 200);
  assert.equal(r.data.songs.length, 8);
  assert.ok(!('audioFile' in r.data.songs[0]), 'nama file audio tidak boleh bocor');
  assert.ok(!('lyrics' in r.data.songs[0]));
});

test('Alur 1: pencarian cocok dan kosong', { skip }, async () => {
  const c = client(srv.base);
  const hit = await c.get('/songs?q=langit');
  assert.deepEqual(hit.data.songs.map((s) => s.title), ['Langit Senja']);
  // "senja" cocok dengan judul lagu 1 dan nama penyanyi Kirana Senja (lagu 6)
  const multi = await c.get('/songs?q=SENJA');
  assert.deepEqual(multi.data.songs.map((s) => s.title).sort(), ['Langit Senja', 'Layar Terkembang']);
  const byArtist = await c.get('/songs?q=' + encodeURIComponent('banyu'));
  assert.equal(byArtist.data.songs.length, 2);
  const none = await c.get('/songs?q=tidak-ada-lagu-ini');
  assert.equal(none.status, 200);
  assert.deepEqual(none.data.songs, []);
  const wildcard = await c.get('/songs?q=%25');
  assert.equal(wildcard.data.songs.length, 0, 'karakter % harus di-escape');
  const genre = await c.get('/songs?genre=Rock');
  assert.equal(genre.data.songs.length, 2);
});

test('Alur 1: detail lagu memuat lirik; id tidak ada -> 404', { skip }, async () => {
  const c = client(srv.base);
  const r = await c.get('/songs/1');
  assert.match(r.data.song.lyrics, /senja/i);
  assert.equal((await c.get('/songs/9999')).status, 404);
  assert.equal((await c.get('/songs/abc')).status, 400);
});

test('Alur 1: cuplikan dapat diputar Pengunjung dan Pelanggan login', { skip }, async () => {
  const guest = client(srv.base);
  const g = await guest.get('/songs/1/preview');
  assert.equal(g.status, 200);
  assert.equal(g.headers.get('content-type'), 'audio/mpeg');
  assert.ok(g.data.length > 1000);
  const cust = client(srv.base);
  await cust.login(...RANI);
  assert.equal((await cust.get('/songs/1/preview')).status, 200);
  assert.equal((await cust.get('/songs')).data.songs.length, 8);
});

test('Alur 2: registrasi publik selalu CUSTOMER (role dari klien diabaikan)', { skip }, async () => {
  const c = client(srv.base);
  const r = await c.post('/auth/register', { email: 'Baru@Contoh.test', password: 'rahasia123', fullName: 'Pengguna Baru', role: 'ADMIN' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'CUSTOMER');
  assert.equal(r.data.user.email, 'baru@contoh.test');
  assert.equal((await c.get('/admin/dashboard')).status, 403);
  const row = await srv.pool.query("SELECT password_hash FROM users WHERE email = 'baru@contoh.test'");
  assert.match(row.rows[0].password_hash, /^\$2[aby]\$/, 'kata sandi harus di-hash BCrypt');
});

test('Alur 2: registrasi menolak data tidak valid dan email duplikat', { skip }, async () => {
  const c = client(srv.base);
  const bad = await c.post('/auth/register', { email: 'x', password: '1', fullName: '' });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.error.details.email && bad.data.error.details.password && bad.data.error.details.fullName);
  const dup = await c.post('/auth/register', { email: 'rani@musicpedia.test', password: 'rahasia123', fullName: 'Dobel' });
  assert.equal(dup.status, 409);
});

test('Alur 2: login salah ditolak; login & logout; setelah logout API meminta masuk', { skip }, async () => {
  const c = client(srv.base);
  assert.equal((await c.post('/auth/login', { email: RANI[0], password: 'salah-salah' })).status, 401);
  assert.equal((await c.post('/auth/login', { email: 'tidak@ada.test', password: 'salah-salah' })).status, 401);
  assert.equal((await c.get('/auth/me')).status, 401);
  await c.login(...RANI);
  assert.equal((await c.get('/auth/me')).data.user.email, RANI[0]);
  assert.equal((await c.get('/orders')).status, 200);
  assert.equal((await c.post('/auth/logout')).status, 204);
  assert.equal((await c.get('/auth/me')).status, 401);
  assert.equal((await c.get('/orders')).status, 401);
  assert.equal((await c.get('/library')).status, 401);
});

test('Alur 2: pelanggan mengubah profil sendiri, ditolak untuk profil orang lain', { skip }, async () => {
  const c = client(srv.base);
  const me = await c.login(...RANI);
  const ok = await c.put(`/customers/${me.id}/profile`, { fullName: 'Rani K.', phone: '08111', address: 'Alamat baru' });
  assert.equal(ok.status, 200);
  assert.equal((await c.get(`/customers/${me.id}/profile`)).data.profile.fullName, 'Rani K.');
  const budi = await srv.pool.query("SELECT id FROM users WHERE email = $1", [BUDI[0]]);
  const other = await c.put(`/customers/${budi.rows[0].id}/profile`, { fullName: 'Diretas', phone: '', address: '' });
  assert.equal(other.status, 403);
  assert.equal((await c.get(`/customers/${budi.rows[0].id}/profile`)).status, 403);
  const check = await srv.pool.query('SELECT full_name FROM customer_profiles WHERE user_id = $1', [budi.rows[0].id]);
  assert.equal(check.rows[0].full_name, 'Budi Santoso');
  const invalid = await c.put(`/customers/${me.id}/profile`, { fullName: '' });
  assert.equal(invalid.status, 400);
});

test('Alur 2: pelanggan ditolak di semua endpoint admin; admin diterima', { skip }, async () => {
  const c = client(srv.base);
  await c.login(...RANI);
  for (const url of ['/admin/dashboard', '/admin/songs', '/admin/customers', '/admin/sales', '/admin/sales/export.csv', '/admin/sales/export.pdf']) {
    assert.equal((await c.get(url)).status, 403, url);
  }
  assert.equal((await c.post('/admin/songs', {})).status, 403);
  assert.equal((await c.del('/admin/songs/1')).status, 403);
  const anon = client(srv.base);
  assert.equal((await anon.get('/admin/dashboard')).status, 401);
  const admin = client(srv.base);
  await admin.login(...ADMIN);
  assert.equal((await admin.get('/admin/dashboard')).status, 200);
});
