# MusicPedia (varian pembelian lagu satuan)

Layanan musik digital: lihat & cari lagu, dengarkan cuplikan, beli lagu satuan (pembayaran simulasi), lalu putar/unduh MP3 yang dimiliki untuk didengar offline. Admin mengelola lagu & pelanggan serta melihat/mengekspor laporan penjualan (CSV, PDF).

- **Frontend**: React + Vite + Tailwind CSS v4 + React Router (`.jsx`), Node.js 26
- **Backend**: Express 5 — alur `Route → Controller → Service → Repository → PostgreSQL` (`pg`, kueri berparameter), Node.js 26
- **Database**: PostgreSQL 17, diinisialisasi dari [musicpedia.sql](musicpedia.sql)
- **Keamanan**: sandi di-hash BCrypt, sesi JWT di cookie `HttpOnly`, pemeriksaan peran & kepemilikan di API, secret hanya di sisi server

## Menjalankan dengan Docker Compose

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
# edit .env: ganti POSTGRES_PASSWORD dan JWT_SECRET (wajib diisi)
docker compose up --build
```

Buka aplikasi di **http://localhost:8080** (ubah `FRONTEND_PORT` di `.env` bila port bentrok).
Hanya service `frontend` yang membuka port ke host. Browser mengakses `/api` pada origin frontend, lalu frontend meneruskannya ke Express lewat jaringan internal Compose (`backend:3000`); `db` dan `backend` tidak terekspos.

| Keperluan | Perintah |
|---|---|
| Jalan di latar belakang | `docker compose up --build -d` |
| Status & health | `docker compose ps` |
| Log semua / satu service | `docker compose logs -f` / `docker compose logs -f backend` |
| Hentikan (data tetap) | `docker compose down` |
| Hentikan + hapus data DB (reset ke data demo) | `docker compose down -v` |

`musicpedia.sql` hanya dijalankan ketika volume `pgdata` masih kosong. Untuk memuat ulang data demo, jalankan `docker compose down -v` lalu `up` lagi.

## Akun demo (sintetis)

| Peran | Email | Kata sandi |
|---|---|---|
| Admin | `admin@musicpedia.test` | `Admin123!` |
| Pelanggan (punya 1 lagu + 1 pesanan tertunda) | `rani@musicpedia.test` | `Customer123!` |
| Pelanggan (punya 2 lagu) | `budi@musicpedia.test` | `Customer123!` |
| Pelanggan (belum membeli) | `sari@musicpedia.test` | `Customer123!` |

Katalog berisi 8 lagu fiksi. Audio dibangkitkan secara sintetis (nada sederhana, original) oleh `backend/scripts/generate-audio.js`; lirik ditulis orisinal untuk demo. Pembayaran **simulasi**: tombol "Bayar sekarang" mengonfirmasi pesanan, "Simulasikan gagal" menghasilkan status GAGAL. Tidak ada uang/kartu sungguhan.

## Peta halaman (UI)

| Rute | Akses | Isi |
|---|---|---|
| `/` | Publik | Katalog, pencarian, filter genre, cuplikan |
| `/songs/:id` | Publik | Detail, lirik, cuplikan, tombol beli |
| `/register`, `/login` | Publik | Registrasi (selalu CUSTOMER) & masuk |
| `/dashboard?tab=profile\|library\|history` | Pelanggan | Ubah profil, pustaka (putar/unduh), riwayat |
| `/checkout/:songId` | Pelanggan | Pembayaran simulasi |
| `/admin`, `/admin/songs`, `/admin/customers`, `/admin/sales` | Admin | Dashboard, CRUD lagu, CRUD pelanggan, laporan + ekspor |

## Kontrak API singkat

Semua di bawah `/api`. Galat berbentuk `{"error":{"code","message","details"}}`.

| Endpoint | Akses |
|---|---|
| `GET /health` | publik |
| `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me` | publik / sesi |
| `GET /songs?q=&genre=`, `/songs/genres`, `/songs/:id`, `/songs/:id/preview` | publik |
| `GET /songs/:id/stream`, `/songs/:id/download` | pelanggan **yang sudah membeli** |
| `GET/PUT /customers/:id/profile` | hanya pemilik profil |
| `POST /orders {songId}`, `POST /orders/:id/pay {paymentRef,outcome?}`, `GET /orders`, `GET /library` | pelanggan |
| `/admin/songs`, `/admin/customers` (GET, POST, GET/PUT/DELETE `/:id`), `/admin/lookups`, `/admin/dashboard` | admin |
| `GET /admin/sales?from=&to=`, `/admin/sales/export.csv`, `/admin/sales/export.pdf` | admin |

Catatan desain:
- **Idempoten**: `POST /orders/:id/pay` memakai kunci baris (`FOR UPDATE`); konfirmasi kedua mengembalikan `alreadyPaid: true` tanpa membuat penjualan baru.
- **Histori aman**: `sale_items` menyalin judul/penyanyi/harga, `sales` menyalin nama/email pelanggan; FK `ON DELETE SET NULL` sehingga laporan tetap terbaca setelah lagu/pelanggan dihapus.
- **Laporan = CSV = PDF**: ketiganya memakai satu kueri (`report.repository.js`), hanya transaksi `PAID`.
- **Audio lagu baru**: formulir admin menerima *nama file* MP3 yang sudah berada di `backend/storage/audio` / `previews` (belum ada fitur unggah).
- **Logout** menghapus cookie sesi; token berupa JWT stateless (masa berlaku 8 jam), tetapi akun yang dihapus/dinonaktifkan langsung ditolak karena pengguna dimuat ulang dari DB di setiap request.

## Pengembangan & tes tanpa Docker

Prasyarat: Node.js ≥ 22 (diuji pada 26) dan PostgreSQL (bisa dari `docker run`).

```bash
# Backend
cd backend && npm ci
# Tes unit berjalan tanpa DB; tes integrasi butuh DB KOSONG/BUANGAN (skema di-reset dari musicpedia.sql!)
docker run -d --name mp-testdb -e POSTGRES_PASSWORD=test -e POSTGRES_DB=mptest -p 55432:5432 postgres:17-alpine
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/mptest npm test

# Frontend
cd ../frontend && npm ci && npm test && npm run build
```

Menjalankan mode dev: backend `DATABASE_URL=... npm run dev` (port 3000), frontend `npm run dev` (port 5173, `/api` di-proxy ke `localhost:3000`).

Smoke test end-to-end terhadap stack yang berjalan: `node scripts/smoke.mjs http://localhost:8080`.

Checklist verifikasi dan matriks use case: [docs/CHECKLIST.md](docs/CHECKLIST.md).

## Struktur

```
compose.yaml  .env.example  musicpedia.sql  README.md
backend/   src/{routes,controllers,services,repositories,middleware}  storage/{audio,previews}  test/  Dockerfile
frontend/  src/{pages,components}  Dockerfile  vite.config.js
scripts/smoke.mjs   docs/CHECKLIST.md
```
