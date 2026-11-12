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

## Use case Software Request → aplikasi

Pemetaan diagram use case pada *Software Request MusicPedia* (26 Oktober 2023) ke aplikasi. Istilah mengikuti [GLOSSARY.md](GLOSSARY.md); detail tes per use case ada di [docs/CHECKLIST.md](docs/CHECKLIST.md).

| Use case (diagram) | Istilah glosarium | Aktor | Menu / rute | Endpoint (`/api`) | Tes |
|---|---|---|---|---|---|
| Melakukan Registrasi | Registrasi → Customer | Pengunjung | `/register` | `POST /auth/register` | `catalog-auth.test.js` |
| Melihat Daftar Lagu | Catalogue | Pengunjung, Pelanggan | `/`, `/songs/:id` | `GET /songs?q=&genre=`, `/songs/:id` | `catalog-auth.test.js`, `app.test.jsx` |
| Memutar Trial Lagu | **Preview** (cuplikan) | Pengunjung, Pelanggan | tombol ▶ di kartu/detail | `GET /songs/:id/preview` | `catalog-auth.test.js`, `app.test.jsx` |
| Melakukan Login dan Logout | — | Pelanggan, Admin | `/login`, tombol Keluar | `POST /auth/login`, `/auth/logout` | `catalog-auth.test.js`, `app.test.jsx` |
| Mengubah Data Pribadi | Customer Profile | Pelanggan | `/dashboard?tab=profile` | `GET/PUT /customers/:id/profile` | `catalog-auth.test.js` |
| Melakukan Pembelian Lagu | Order → Sale (Simulated Payment) | Pelanggan | Beli → `/checkout/:songId`, `/dashboard?tab=history` | `POST /orders`, `/orders/:id/pay`, `GET /orders` | `orders.test.js` |
| Mengelola Data Lagu | Song, Retired Song | Admin | `/admin/songs` | `/admin/songs…` | `admin.test.js` |
| Mengelola Data Pelanggan | Customer, Deactivate, Delete | Admin | `/admin/customers` | `/admin/customers…` | `admin.test.js` |
| Mengekspor Laporan Penjualan Lagu | Sale | Admin | `/admin/sales` | `GET /admin/sales`, `export.csv`, `export.pdf` | `admin.test.js`, smoke |
| **Memutar & Mengunduh Lagu** — *tambahan* | Library, Owned Song, Full Song | Pelanggan | `/dashboard?tab=library` | `GET /library`, `/songs/:id/stream`, `/songs/:id/download` | `orders.test.js` |

*Memutar & Mengunduh Lagu* tidak ada di diagram, tetapi merupakan janji utama deskripsi ("mendengarkan … mp3 secara offline"). Backend memeriksa kepemilikan sebelum mengirim Full Song.

## Kebutuhan non-fungsional

Status tiap kebutuhan non-fungsional *Software Request* untuk build pelatihan ini. Status: **terpenuhi**, **diperiksa skrip**, **urusan hosting** (harus disediakan saat deployment), **salah ketik**.

| Kebutuhan | Tafsiran | Status | Bukti / catatan |
|---|---|---|---|
| Dapat digunakan oleh semua perangkat lunak lainnya | Berjalan di browser modern pada OS apa pun; sistem lain dapat berintegrasi lewat REST API | **terpenuhi** | SPA standar + [Kontrak API](#kontrak-api-singkat) |
| Ketersediaan 99% | — | **urusan hosting** | Kontribusi aplikasi: health check + `restart: unless-stopped` di `compose.yaml`. Butuh hosting dan pemantauan. |
| Waktu respon ≤ 2 detik | Setiap respon (maksimum, bukan rata-rata) | **diperiksa skrip** | `node scripts/load.mjs` — 2026-11-12: 1.500 permintaan, 0 galat, median 148 ms, p95 204 ms, maks 250 ms |
| > 50 pengguna bersamaan | 50 Pengunjung serentak × 10 iterasi (daftar, cari, detail) | **diperiksa skrip** | idem |
| Server bersih dari virus | — | **urusan hosting** | Antivirus/hardening server di luar cakupan aplikasi |
| Tidak ada akses tanpa otorisasi | Autentikasi, cek peran, dan cek kepemilikan di API | **terpenuhi** | `catalog-auth.test.js`, `orders.test.js`, `admin.test.js` |
| Data hanya diubah administrator | Data Catalogue dan data Customer lain hanya oleh Admin; Customer hanya mengubah Customer Profile miliknya | **terpenuhi** (dengan tafsiran ini) | Diagram use case sendiri memuat *Mengubah Data Pribadi* untuk Pelanggan |
| Backup tiap 24 jam, disimpan di lokasi berbeda | — | **skrip + cron disediakan**; penyimpanan offsite **urusan hosting** | Lihat [Backup & pemulihan](#backup--pemulihan) |
| Komunikasi client-server aman | HTTPS | **urusan hosting** | Pasang terminasi TLS (reverse proxy) di depan `frontend` dan set `COOKIE_SECURE=true` |
| Go live sebelum 25 Januari 2018 | Lebih awal dari tanggal permintaan (26 Oktober 2023) | **salah ketik** | Perlu dikonfirmasi ke sponsor |
| Tenggat pengembangan | — | tidak berlaku | Build pelatihan |

Uji beban (stack harus berjalan; hanya membaca data):

```bash
node scripts/load.mjs http://localhost:8080          # [origin] [pengguna=50] [iterasi=10]
```

Lulus bila tidak ada galat **dan** respon terlama ≤ 2000 ms; kode keluar 1 bila gagal.

## Backup & pemulihan

```bash
./scripts/backup.sh        # -> backups/musicpedia-YYYYMMDD-HHMMSS.sql (folder backups/ tidak di-commit)
```

Skrip menjalankan `pg_dump` di dalam service `db` dan menolak menyimpan dump kosong/tidak lengkap (mis. bila `db` tidak berjalan).

Jadwal harian lewat cron di host (pukul 02.00):

```cron
0 2 * * * cd /path/ke/MusicPedia && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Salin isi `backups/` ke lokasi lain (penyimpanan objek, server lain) sesuai kebijakan hosting — kebutuhan "disimpan di lokasi berbeda" tidak dipenuhi oleh skrip ini.

Pemulihan **menimpa seluruh data**. Kosongkan skema dulu, lalu muat dump:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/musicpedia-YYYYMMDD-HHMMSS.sql
```

Diuji 2026-11-12: backup → tambah pelanggan penanda → reset skema → pulihkan → jumlah lagu/penjualan/pengguna kembali sama (8/5/4) dan penanda hilang; smoke test lulus setelahnya.

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
scripts/{smoke.mjs,load.mjs,backup.sh}   docs/CHECKLIST.md
```
