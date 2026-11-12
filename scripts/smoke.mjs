// Smoke test end-to-end terhadap stack yang sedang berjalan (lewat origin frontend).
// Pakai:  node scripts/smoke.mjs [http://localhost:8080]
// Mengubah data (membuat 1 pelanggan uji + 1 pembelian). Idempoten; aman diulang.
const ORIGIN = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? 'LULUS ' : 'GAGAL '} ${name}`); if (!cond) failed++; };

function session() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(ORIGIN + path, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : ct.startsWith('text/') ? await res.text() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  };
}

const guest = session();
const html = await guest('GET', '/');
ok(html.status === 200 && String(html.data).includes('<div id="root">'), 'frontend menyajikan SPA');
ok((await guest('GET', '/api/health')).data.status === 'ok', 'proxy /api -> Express health');

const songs = (await guest('GET', '/api/songs')).data.songs;
ok(songs.length >= 8, `katalog dari PostgreSQL (${songs.length} lagu)`);
ok((await guest('GET', '/api/songs?q=tidak-ada-xyz')).data.songs.length === 0, 'pencarian tanpa hasil -> kosong');
const pv = await guest('GET', '/api/songs/1/preview');
ok(pv.status === 200 && pv.headers.get('content-type') === 'audio/mpeg', 'cuplikan dapat diputar tanpa login');
ok((await guest('GET', '/api/songs/1/download')).status === 401, 'unduhan tanpa login ditolak');

const email = `smoke${Date.now()}@musicpedia.test`;
const cust = session();
const reg = await cust('POST', '/api/auth/register', { email, password: 'rahasia123', fullName: 'Smoke Test', role: 'ADMIN' });
ok(reg.status === 201 && reg.data.user.role === 'CUSTOMER', 'registrasi publik -> CUSTOMER');
ok((await cust('GET', '/api/admin/sales')).status === 403, 'pelanggan ditolak di endpoint admin');
ok((await cust('GET', '/api/songs/2/download')).status === 403, 'unduhan lagu belum dibeli ditolak');

const order = (await cust('POST', '/api/orders', { songId: 2 })).data.order;
const p1 = await cust('POST', `/api/orders/${order.id}/pay`, { paymentRef: order.paymentRef });
const p2 = await cust('POST', `/api/orders/${order.id}/pay`, { paymentRef: order.paymentRef });
ok(p1.status === 200 && p2.status === 200 && p2.data.alreadyPaid === true, 'konfirmasi pembayaran dua kali idempoten');
const dl = await cust('GET', '/api/songs/2/download');
ok(dl.status === 200 && dl.data.length > 10000, 'MP3 penuh dapat diunduh setelah bayar');
ok((await cust('GET', '/api/orders')).data.orders.filter((o) => o.songId === 2 && o.status === 'PAID').length === 1, 'riwayat mencatat satu pembelian');

await cust('POST', '/api/auth/logout');
ok((await cust('GET', '/api/auth/me')).status === 401, 'setelah logout API meminta login');

const admin = session();
ok((await admin('POST', '/api/auth/login', { email: 'admin@musicpedia.test', password: 'Admin123!' })).status === 200, 'login admin');
const rep = (await admin('GET', '/api/admin/sales')).data;
ok(rep.rows.filter((r) => r.customerEmail === email).length === 1, 'laporan memuat tepat satu penjualan uji');
const csv = (await admin('GET', '/api/admin/sales/export.csv')).data;
ok(csv.trim().split('\r\n').length === rep.rows.length + 2, 'CSV memuat baris yang sama dengan laporan');
const pdf = await admin('GET', '/api/admin/sales/export.pdf');
ok(pdf.status === 200 && pdf.data.subarray(0, 5).toString() === '%PDF-', 'PDF valid');

console.log(failed ? `\n${failed} pemeriksaan GAGAL` : '\nSemua pemeriksaan LULUS');
process.exit(failed ? 1 : 0);
