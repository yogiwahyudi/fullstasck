# Checklist Verifikasi MusicPedia

Status: **lulus** / **gagal** / **tertunda**. Kolom "Bukti" menunjukkan pemeriksaan yang sudah dijalankan pada sesi pembangunan (2026-11-10).

## A. Matriks use case → UI → API → tes

| Use case | Menu / aksi | Endpoint | Tes |
|---|---|---|---|
| Registrasi (Pengunjung) | `/register` | `POST /auth/register` | `catalog-auth.test.js` (Alur 2), smoke |
| Lihat daftar & cari lagu | `/` (kotak cari, filter genre) | `GET /songs`, `/songs/genres` | `catalog-auth.test.js` (Alur 1), `app.test.jsx` |
| Detail lagu | `/songs/:id` | `GET /songs/:id` | `catalog-auth.test.js` |
| Putar cuplikan (Pengunjung & Pelanggan) | tombol ▶/❚❚ + progres di kartu/detail | `GET /songs/:id/preview` | `catalog-auth.test.js`, `app.test.jsx` (Cuplikan) |
| Login / logout | `/login`, tombol Keluar | `POST /auth/login`, `/auth/logout`, `GET /auth/me` | `catalog-auth.test.js`, `app.test.jsx` |
| Dashboard & ubah profil sendiri | `/dashboard?tab=profile` | `GET/PUT /customers/:id/profile` | `catalog-auth.test.js` (403 profil orang lain) |
| Beli lagu (simulasi) | Beli → `/checkout/:songId` | `POST /orders`, `POST /orders/:id/pay` | `orders.test.js` |
| Riwayat pembelian | `/dashboard?tab=history` | `GET /orders` | `orders.test.js` |
| Putar & unduh MP3 dibeli | `/dashboard?tab=library` | `GET /songs/:id/stream`, `/download` | `orders.test.js` |
| Admin: dashboard | `/admin` | `GET /admin/dashboard` | `admin.test.js` |
| Admin: CRUD lagu | `/admin/songs` | `/admin/songs…` | `admin.test.js` |
| Admin: CRUD pelanggan | `/admin/customers` | `/admin/customers…` | `admin.test.js` |
| Admin: laporan + CSV/PDF | `/admin/sales` | `GET /admin/sales`, `export.csv`, `export.pdf` | `admin.test.js`, smoke |
| Kondisi loading / kosong / validasi / gagal request | semua halaman data | — | `app.test.jsx`, `validate.test.js` |

## B. Pemeriksaan otomatis (sudah dijalankan)

| Pemeriksaan | Perintah | Status | Bukti |
|---|---|---|---|
| Tes backend (unit + integrasi PostgreSQL asli) | `TEST_DATABASE_URL=… npm test` di `backend/` | **lulus** | 25/25 |
| Tes frontend | `npm test` di `frontend/` | **lulus** | 10/10 |
| Build produksi frontend | `npm run build` di `frontend/` | **lulus** | 40 modul |
| `compose.yaml` valid & image terbangun | `docker compose up --build` | **lulus** | 3 service healthy |
| DB terinisialisasi dari `musicpedia.sql` | `docker compose exec db psql … select count(*) from songs` | **lulus** | 8 lagu |
| Smoke E2E lewat origin frontend (proxy `/api`) | `node scripts/smoke.mjs http://localhost:8088` | **lulus** | 17/17 |
| Persistensi setelah `down` → `up` | lihat C-9 | **lulus** | penjualan tetap 4; log "Skipping initialization" |

## C. Checklist manual (jalankan setelah Docker tersedia)

Prasyarat umum: Docker + Compose v2, `.env` hasil salin `.env.example` (isi `POSTGRES_PASSWORD`, `JWT_SECRET`), port `FRONTEND_PORT` bebas. Reset bersih: `docker compose down -v`.

| # | Pemeriksaan | Langkah / perintah | Hasil yang diharapkan | Status |
|---|---|---|---|---|
| 1 | Startup layanan | `docker compose up --build -d`, lalu `docker compose ps` | `db`, `backend`, `frontend` berstatus `healthy`; hanya frontend memetakan port | **lulus** (otomatis) |
| 2 | Data demo | `docker compose exec db psql -U musicpedia -d musicpedia -c "select count(*) from songs"` | 8 | **lulus** |
| 3 | Katalog & cuplikan di browser | Buka `http://localhost:8080` tanpa login, klik ▶ pada satu lagu; ulangi setelah login sebagai Rani | Audio terdengar, tombol jadi ❚❚, bar progres bergerak; cari "senja" → 2 lagu; cari "zzz" → kondisi kosong | **tertunda** (perlu browser/audio; API-nya lulus) |
| 4 | Login & logout di browser | Login `rani@musicpedia.test`; klik Keluar; buka `/dashboard` | Setelah keluar diarahkan ke `/login` | **tertunda** (API lulus, UI belum dicek manual) |
| 5 | Pembelian & unduhan | Login Sari → lagu → Beli → Bayar sekarang → klik Bayar lagi/refresh → tab Pustaka → Unduh MP3 | Status LUNAS, satu baris di Riwayat, file `.mp3` terunduh dan terputar | **tertunda** di browser (API/idempotensi lulus) |
| 6 | Hak akses admin | Login Rani lalu buka `/admin` dan `curl -b … /api/admin/sales` | Halaman "Akses ditolak"; API 403 | **lulus** (API & komponen), UI browser **tertunda** |
| 7 | CRUD admin | Login admin → tambah/ubah/hapus lagu & pelanggan; muat ulang halaman | Perubahan tetap ada setelah reload | **lulus** (API), UI browser **tertunda** |
| 8 | Ekspor CSV/PDF | `/admin/sales` → ⬇ CSV, ⬇ PDF (dengan & tanpa filter tanggal) | Jumlah baris & total sama dengan layar; PDF terbuka | **lulus** (isi diverifikasi otomatis), tampilan PDF **tertunda** |
| 9 | Persistensi setelah restart | `docker compose down` → `docker compose up -d` → hitung `sales` | Data sama; log db: "Skipping initialization" | **lulus** |
| 10 | Reset data demo | `docker compose down -v && docker compose up --build -d` | 4 transaksi demo (3 lunas, 1 menunggu) | **tertunda** (tidak dijalankan ulang) |
| 11 | Responsif/aksesibilitas visual | Buka di lebar 375 px dan desktop | Tata letak tidak patah, kontrol dapat dipakai keyboard | **tertunda** |
