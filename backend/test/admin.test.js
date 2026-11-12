import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, BUDI, client, skip, startServer } from './helpers.js';

let srv;
let admin;
before(async () => {
  if (skip) return;
  srv = await startServer();
  admin = client(srv.base);
  await admin.login(...ADMIN);
});
after(async () => { await srv?.close(); });

const song = (over = {}) => ({
  title: 'Lagu Uji', genre: 'Pop', artist: 'Penyanyi Uji', composer: 'Pencipta Uji', label: 'Label Uji',
  lyrics: 'bait satu', price: 7000, durationSec: 120, releaseYear: 2026, ...over,
});

test('Alur 4: CRUD lagu persisten, validasi, dan audio direferensikan', { skip }, async () => {
  const bad = await admin.post('/admin/songs', song({ title: '', price: -5, audioFile: '../../etc/passwd' }));
  assert.equal(bad.status, 400);
  assert.ok(bad.data.error.details.title && bad.data.error.details.price && bad.data.error.details.audioFile);

  const created = await admin.post('/admin/songs', song({ audioFile: 'song-1.mp3', previewFile: 'preview-1.mp3' }));
  assert.equal(created.status, 201);
  const id = created.data.song.id;
  // "muat ulang": klien baru/permintaan baru tetap menemukan data di DB
  assert.equal((await client(srv.base).get(`/songs/${id}`)).data.song.title, 'Lagu Uji');

  const upd = await admin.put(`/admin/songs/${id}`, song({ title: 'Lagu Uji Ubah', price: 7500 }));
  assert.equal(upd.status, 200);
  assert.equal((await admin.get(`/admin/songs/${id}`)).data.song.price, 7500);
  assert.equal((await admin.get('/admin/songs?q=ubah')).data.songs.length, 1);

  assert.equal((await admin.del(`/admin/songs/${id}`)).status, 204);
  assert.equal((await admin.get(`/admin/songs/${id}`)).status, 404);
  assert.equal((await admin.del(`/admin/songs/${id}`)).status, 404);
});

test('Alur 4: CRUD pelanggan persisten dan tervalidasi', { skip }, async () => {
  const bad = await admin.post('/admin/customers', { email: 'x', password: '1' });
  assert.equal(bad.status, 400);
  const created = await admin.post('/admin/customers', { email: 'Tes@Contoh.test', password: 'rahasia123', fullName: 'Tes Pelanggan', phone: '0812', address: 'A' });
  assert.equal(created.status, 201);
  const id = created.data.customer.id;
  assert.equal((await admin.post('/admin/customers', { email: 'tes@contoh.test', password: 'rahasia123', fullName: 'Dobel' })).status, 409);
  assert.equal((await admin.put(`/admin/customers/${id}`, { email: 'tes@contoh.test', fullName: 'Tes Ubah', isActive: false })).status, 200);
  const got = (await admin.get(`/admin/customers/${id}`)).data.customer;
  assert.equal(got.fullName, 'Tes Ubah');
  assert.equal(got.isActive, false);
  // akun nonaktif tidak bisa login
  assert.equal((await client(srv.base).post('/auth/login', { email: 'tes@contoh.test', password: 'rahasia123' })).status, 401);
  assert.ok((await admin.get('/admin/customers?q=ubah')).data.customers.some((c) => c.id === id));
  // admin tidak muncul / tidak bisa dihapus lewat endpoint pelanggan
  assert.equal((await admin.get('/admin/customers/1')).status, 404);
  assert.equal((await admin.del('/admin/customers/1')).status, 404);
  assert.equal((await admin.del(`/admin/customers/${id}`)).status, 204);
  assert.equal((await admin.get(`/admin/customers/${id}`)).status, 404);
});

test('Alur 4: histori penjualan tetap terbaca setelah lagu & pelanggan dihapus', { skip }, async () => {
  const before = (await admin.get('/admin/sales')).data;
  assert.equal(before.rows.length, 3);
  const budiId = (await srv.pool.query('SELECT id FROM users WHERE email = $1', [BUDI[0]])).rows[0].id;
  assert.equal((await admin.del('/admin/songs/1')).status, 204);
  assert.equal((await admin.del(`/admin/customers/${budiId}`)).status, 204);
  const after = (await admin.get('/admin/sales')).data;
  assert.equal(after.rows.length, 3);
  assert.deepEqual(after.summary, before.summary);
  const row = after.rows.find((r) => r.songTitle === 'Langit Senja');
  assert.ok(row, 'judul lagu tetap tersimpan sebagai snapshot');
  assert.equal(row.customerEmail, BUDI[0]);
  assert.equal(row.customerName, 'Budi Santoso');
});

test('Alur 4: laporan, filter tanggal, CSV & PDF memuat data yang sama', { skip }, async () => {
  const rep = (await admin.get('/admin/sales')).data;
  assert.equal(rep.summary.transactions, rep.rows.length);
  assert.equal(rep.summary.total, rep.rows.reduce((a, r) => a + r.price, 0));

  const ranged = (await admin.get('/admin/sales?from=2026-10-12&to=2026-10-12')).data;
  assert.equal(ranged.rows.length, 1);
  assert.equal(ranged.rows[0].invoiceNo, 'INV-20261012-0002');
  assert.equal((await admin.get('/admin/sales?from=2026-12-01')).data.rows.length, 0);
  assert.equal((await admin.get('/admin/sales?from=bukan-tanggal')).status, 400);
  assert.equal((await admin.get('/admin/sales?from=2026-10-20&to=2026-10-01')).status, 400);

  const csv = await admin.get('/admin/sales/export.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const lines = csv.data.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines[0], 'Invoice,Tanggal Bayar,Pelanggan,Email,Lagu,Penyanyi,Harga');
  assert.equal(lines.length, rep.rows.length + 2); // header + data + total
  for (const r of rep.rows) {
    assert.ok(lines.some((l) => l.startsWith(r.invoiceNo) && l.endsWith(',' + r.price)), r.invoiceNo);
  }
  assert.ok(lines.at(-1).endsWith(',' + rep.summary.total));

  const csvRange = await admin.get('/admin/sales/export.csv?from=2026-10-12&to=2026-10-12');
  assert.equal(csvRange.data.trim().split('\r\n').length, 3);

  const pdf = await admin.get('/admin/sales/export.pdf');
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.data.length > 1000);
});

test('Alur 4: sel CSV berawalan rumus dinetralkan', { skip }, async () => {
  await srv.pool.query("UPDATE sales SET customer_name = '=HYPERLINK(\"x\")' WHERE invoice_no = 'INV-20261020-0003'");
  const csv = (await admin.get('/admin/sales/export.csv')).data;
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
});

test('Alur 4: dasbor admin', { skip }, async () => {
  const s = (await admin.get('/admin/dashboard')).data.stats;
  assert.equal(typeof s.revenue, 'number');
  assert.equal(s.sales, 3);
});
