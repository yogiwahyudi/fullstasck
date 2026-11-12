// Uji beban katalog terhadap stack yang sedang berjalan (lewat origin frontend, sama seperti smoke.mjs).
// Kebutuhan Software Request: respon tidak lebih dari 2 detik untuk lebih dari 50 pengguna bersamaan.
// Pakai:  node scripts/load.mjs [origin=http://localhost:8080] [pengunjung=51] [iterasi=10]
// Hanya membaca data (sebagai Pengunjung). Keluar dengan kode 1 bila ada galat, respon terlalu lambat, atau tidak ada yang diukur.
const ORIGIN = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const VISITORS = positiveInt(process.argv[3], 51, 'pengunjung');
const ITERATIONS = positiveInt(process.argv[4], 10, 'iterasi');
const LIMIT_MS = 2000;
const SEARCH_TERM = 'senja'; // cocok dengan data demo

function positiveInt(arg, fallback, name) {
  if (arg === undefined) return fallback;
  const n = Number(arg);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`GAGAL  ${name} harus bilangan bulat >= 1 (diberikan: ${arg})`);
    process.exit(1);
  }
  return n;
}

const latencies = [];
const errors = [];

/** GET JSON dan catat latensinya; mengembalikan body, atau null bila gagal (galat sudah dicatat). */
async function timedGet(path) {
  const start = performance.now();
  try {
    const res = await fetch(ORIGIN + path, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      await res.body?.cancel();
      latencies.push(performance.now() - start);
      errors.push(`${path} -> HTTP ${res.status}`);
      return null;
    }
    const body = await res.json();
    latencies.push(performance.now() - start);
    return body;
  } catch (err) {
    latencies.push(performance.now() - start);
    errors.push(`${path} -> ${err.name}: ${err.message}`);
    return null;
  }
}

async function visitor(_, visitorIndex) {
  for (let i = 0; i < ITERATIONS; i++) {
    const list = await timedGet('/api/songs');
    await timedGet(`/api/songs?q=${encodeURIComponent(SEARCH_TERM)}`);
    if (!list) continue; // galat daftar sudah dicatat
    const songs = list.songs ?? [];
    if (!songs.length) { errors.push('/api/songs -> katalog kosong'); continue; }
    // Tiap Pengunjung mulai dari lagu yang berbeda agar beban tersebar ke seluruh Catalogue.
    await timedGet(`/api/songs/${songs[(visitorIndex + i) % songs.length].id}`);
  }
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

const health = await fetch(ORIGIN + '/api/health', { signal: AbortSignal.timeout(5_000) }).catch(() => null);
if (!health?.ok) {
  console.error(`GAGAL  stack tidak dapat dijangkau di ${ORIGIN} (jalankan docker compose up -d)`);
  process.exit(1);
}

console.log(`Uji beban: ${VISITORS} Pengunjung bersamaan x ${ITERATIONS} iterasi (daftar, cari, detail) -> ${ORIGIN}`);
const started = performance.now();
await Promise.all(Array.from({ length: VISITORS }, visitor));
const wallMs = performance.now() - started;

if (!latencies.length) {
  console.error('GAGAL  tidak ada permintaan yang terukur');
  process.exit(1);
}

const sorted = [...latencies].sort((a, b) => a - b);
const max = sorted.at(-1);
const fmt = (ms) => `${Math.round(ms)} ms`;
console.log(`Permintaan : ${latencies.length} dalam ${(wallMs / 1000).toFixed(1)} s`);
console.log(`Galat      : ${errors.length}`);
console.log(`Median     : ${fmt(percentile(sorted, 50))}`);
console.log(`p95        : ${fmt(percentile(sorted, 95))} (informasi)`);
console.log(`Maksimum   : ${fmt(max)} (batas ${LIMIT_MS} ms)`);
for (const e of errors.slice(0, 10)) console.log(`  - ${e}`);

const pass = errors.length === 0 && max <= LIMIT_MS;
console.log(pass
  ? `LULUS  semua respon tanpa galat dan <= ${LIMIT_MS} ms`
  : `GAGAL  ada galat atau respon > ${LIMIT_MS} ms`);
process.exit(pass ? 0 : 1);
