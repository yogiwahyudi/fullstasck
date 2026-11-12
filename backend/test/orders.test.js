import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, BUDI, RANI, client, skip, startServer } from './helpers.js';

let srv;
before(async () => { if (!skip) srv = await startServer(); });
after(async () => { await srv?.close(); });

const salesCount = async (songId) =>
  (await srv.pool.query("SELECT count(*)::int AS n FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.song_id = $1 AND s.status = 'PAID'", [songId])).rows[0].n;

test('Alur 3: file penuh ditolak untuk lagu belum dibeli (stream & unduh)', { skip }, async () => {
  const c = client(srv.base);
  await c.login(...RANI);
  assert.equal((await c.get('/songs/1/stream')).status, 403);
  assert.equal((await c.get('/songs/1/download')).status, 403);
  assert.equal((await client(srv.base).get('/songs/1/download')).status, 401);
  // Lagu 5 baru PENDING milik Rani -> belum boleh
  assert.equal((await c.get('/songs/5/download')).status, 403);
  // Lagu 1 milik Budi, bukan Rani
  const budi = client(srv.base);
  await budi.login(...BUDI);
  const own = await budi.get('/songs/1/download');
  assert.equal(own.status, 200);
  assert.match(own.headers.get('content-disposition'), /attachment/);
  assert.equal(own.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await budi.get('/songs/1/stream')).status, 200);
  // admin tidak otomatis memperoleh file penuh
  const admin = client(srv.base);
  await admin.login(...ADMIN);
  assert.equal((await admin.get('/songs/1/download')).status, 403);
});

test('Alur 3: pembelian, konfirmasi ganda idempoten, riwayat & laporan satu penjualan', { skip }, async () => {
  const c = client(srv.base);
  await c.login(...RANI);
  const before = await salesCount(4);
  const created = await c.post('/orders', { songId: 4 });
  assert.equal(created.status, 201);
  const order = created.data.order;
  assert.equal(order.status, 'PENDING');
  // membuat ulang pesanan yang sama -> dipakai ulang
  assert.equal((await c.post('/orders', { songId: 4 })).data.order.id, order.id);
  // referensi salah ditolak
  assert.equal((await c.post(`/orders/${order.id}/pay`, { paymentRef: 'salah' })).status, 400);
  assert.equal((await c.get('/songs/4/download')).status, 403);

  const first = await c.post(`/orders/${order.id}/pay`, { paymentRef: order.paymentRef });
  const second = await c.post(`/orders/${order.id}/pay`, { paymentRef: order.paymentRef });
  assert.equal(first.status, 200);
  assert.equal(first.data.alreadyPaid, false);
  assert.equal(second.status, 200);
  assert.equal(second.data.alreadyPaid, true);
  assert.equal(second.data.sale.status, 'PAID');

  // konfirmasi serentak
  const o2 = (await c.post('/orders', { songId: 6 })).data.order;
  const results = await Promise.all([1, 2, 3].map(() => c.post(`/orders/${o2.id}/pay`, { paymentRef: o2.paymentRef })));
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
  assert.equal(results.filter((r) => !r.data.alreadyPaid).length, 1);

  assert.equal(await salesCount(4), before + 1);
  assert.equal(await salesCount(6), 1);
  const hist = (await c.get('/orders')).data.orders;
  assert.equal(hist.filter((o) => o.songId === 4).length, 1);
  assert.equal(hist.filter((o) => o.songId === 4)[0].status, 'PAID');

  // akses putar & unduh terbuka
  assert.equal((await c.get('/songs/4/stream')).status, 200);
  const dl = await c.get('/songs/4/download');
  assert.equal(dl.status, 200);
  assert.ok(dl.data.length > 10000);
  assert.ok((await c.get('/library')).data.songs.some((s) => s.id === 4));

  // beli lagi yang sudah dimiliki -> 409
  assert.equal((await c.post('/orders', { songId: 4 })).status, 409);

  // laporan admin mencatat tepat satu
  const admin = client(srv.base);
  await admin.login(...ADMIN);
  const rep = (await admin.get('/admin/sales')).data;
  assert.equal(rep.rows.filter((r) => r.songTitle === 'Rimba Raya').length, 1);
});

test('Alur 3: pembayaran gagal tidak memberi akses; pesanan orang lain tidak bisa dibayar', { skip }, async () => {
  const c = client(srv.base);
  await c.login(...RANI);
  const o = (await c.post('/orders', { songId: 8 })).data.order;
  const budi = client(srv.base);
  await budi.login(...BUDI);
  assert.equal((await budi.post(`/orders/${o.id}/pay`, { paymentRef: o.paymentRef })).status, 404);
  const failed = await c.post(`/orders/${o.id}/pay`, { paymentRef: o.paymentRef, outcome: 'FAILED' });
  assert.equal(failed.data.sale.status, 'FAILED');
  assert.equal((await c.get('/songs/8/download')).status, 403);
  assert.equal((await c.post(`/orders/${o.id}/pay`, { paymentRef: o.paymentRef })).status, 409);
  assert.equal((await c.post('/orders', { songId: 99999 })).status, 404);
  assert.equal((await c.post('/orders', {})).status, 400);
  // pesanan baru setelah gagal dimungkinkan
  assert.equal((await c.post('/orders', { songId: 8 })).data.order.status, 'PENDING');
});

test('Alur 3: admin tidak dapat membeli (endpoint pelanggan)', { skip }, async () => {
  const admin = client(srv.base);
  await admin.login(...ADMIN);
  assert.equal((await admin.post('/orders', { songId: 1 })).status, 403);
});
