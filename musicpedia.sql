-- MusicPedia (varian pembelian lagu satuan) - skema + data demo sintetis.
-- Dijalankan otomatis oleh PostgreSQL hanya saat volume data masih kosong.
-- Akun demo (kata sandi di-hash BCrypt):
--   admin@musicpedia.test  / Admin123!
--   rani@musicpedia.test   / Customer123!
--   budi@musicpedia.test   / Customer123!
--   sari@musicpedia.test   / Customer123!

DROP TABLE IF EXISTS sale_items, sales, songs, artists, composers, record_labels, genres, customer_profiles, users, roles CASCADE;

CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('ADMIN', 'CUSTOMER'))
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role_id       INT NOT NULL REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

CREATE TABLE customer_profiles (
  user_id   INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  phone     VARCHAR(30)  NOT NULL DEFAULT '',
  address   VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE genres        (id SERIAL PRIMARY KEY, name VARCHAR(80)  NOT NULL UNIQUE);
CREATE TABLE record_labels (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE);
CREATE TABLE artists       (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE); -- penyanyi
CREATE TABLE composers     (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE); -- pencipta

CREATE TABLE songs (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(150) NOT NULL,
  genre_id      INT NOT NULL REFERENCES genres(id),
  label_id      INT NOT NULL REFERENCES record_labels(id),
  artist_id     INT NOT NULL REFERENCES artists(id),
  composer_id   INT NOT NULL REFERENCES composers(id),
  lyrics        TEXT NOT NULL DEFAULT '',
  price         INT NOT NULL CHECK (price > 0),        -- rupiah
  duration_sec  INT NOT NULL CHECK (duration_sec > 0),
  release_year  INT NOT NULL,
  cover_color   VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  audio_file    VARCHAR(120),                          -- file MP3 penuh (storage/audio)
  preview_file  VARCHAR(120),                          -- cuplikan (storage/previews)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX songs_title_idx ON songs (lower(title));

-- Transaksi penjualan. user_id boleh NULL (pelanggan dihapus); nama/email disalin sebagai snapshot.
CREATE TABLE sales (
  id             SERIAL PRIMARY KEY,
  invoice_no     VARCHAR(40) NOT NULL UNIQUE,
  user_id        INT REFERENCES users(id) ON DELETE SET NULL,
  customer_name  VARCHAR(120) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  total          INT NOT NULL CHECK (total >= 0),
  status         VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  payment_ref    VARCHAR(60) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at        TIMESTAMPTZ
);
CREATE INDEX sales_user_idx ON sales (user_id);

-- Detail pembelian. song_id boleh NULL (lagu dihapus); judul/penyanyi/harga disalin sebagai snapshot.
CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  song_id     INT REFERENCES songs(id) ON DELETE SET NULL,
  song_title  VARCHAR(150) NOT NULL,
  artist_name VARCHAR(120) NOT NULL,
  price       INT NOT NULL CHECK (price >= 0)
);
CREATE INDEX sale_items_song_idx ON sale_items (song_id);

-- ===== Data demo =====
INSERT INTO roles (name) VALUES ('ADMIN'), ('CUSTOMER');

INSERT INTO users (email, password_hash, role_id, created_at) VALUES
  ('admin@musicpedia.test', '$2b$10$ThCAx/TZKciymAA.Z7TexejSd24d5eF6jV.fB4SaafzddnOboH0Xa', 1, '2026-09-01 08:00+07'),
  ('rani@musicpedia.test',  '$2b$10$f0p0MRHyRusAiCIrfCq5kevo7S.VGxDryh.SkycoXym/BgwEk4zfG', 2, '2026-09-10 09:00+07'),
  ('budi@musicpedia.test',  '$2b$10$f0p0MRHyRusAiCIrfCq5kevo7S.VGxDryh.SkycoXym/BgwEk4zfG', 2, '2026-09-12 10:00+07'),
  ('sari@musicpedia.test',  '$2b$10$f0p0MRHyRusAiCIrfCq5kevo7S.VGxDryh.SkycoXym/BgwEk4zfG', 2, '2026-09-15 11:00+07');

INSERT INTO customer_profiles (user_id, full_name, phone, address) VALUES
  (1, 'Administrator MusicPedia', '', ''),
  (2, 'Rani Kusuma',  '081200000001', 'Jl. Contoh No. 1, Bandung'),
  (3, 'Budi Santoso', '081200000002', 'Jl. Contoh No. 2, Surabaya'),
  (4, 'Sari Wulandari', '081200000003', 'Jl. Contoh No. 3, Yogyakarta');

INSERT INTO genres (name) VALUES ('Pop'), ('Akustik'), ('Elektronik'), ('Rock'), ('Jazz'), ('Folk');
INSERT INTO record_labels (name) VALUES ('Nusantara Records'), ('Pelangi Musik'), ('Gema Studio');
INSERT INTO artists (name) VALUES ('Sinta Maharani'), ('Dimas Arya'), ('Nadira Putri'), ('Banyu Biru Band'), ('Laras Wening'), ('Kirana Senja');
INSERT INTO composers (name) VALUES ('Raka Pradipta'), ('Maya Lestari'), ('Fajar Nugraha');

INSERT INTO songs (title, genre_id, label_id, artist_id, composer_id, lyrics, price, duration_sec, release_year, cover_color, audio_file, preview_file) VALUES
 ('Langit Senja', 1, 1, 1, 1,
  E'Langit senja memeluk kota\nLampu jalan mulai menyala\nKu simpan hari di saku jaket\nPulang pelan bersama cahaya\n\nReff:\nOh senja, tunggu sebentar\nBiar kubawa warnamu pulang',
  9000, 192, 2025, '#f97316', 'song-1.mp3', 'preview-1.mp3'),
 ('Hujan di Ujung Jalan', 2, 2, 2, 2,
  E'Hujan turun di ujung jalan\nPayung kecil kita berbagi\nTak ada kata yang terburu\nHanya langkah mengikuti nada\n\nReff:\nBiarlah basah, biarlah hangat\nCerita ini milik kita',
  8000, 215, 2024, '#0ea5e9', 'song-2.mp3', 'preview-2.mp3'),
 ('Denyut Kota', 3, 3, 3, 3,
  E'Denyut kota tak pernah tidur\nNeon berbisik di jendela\nKita berlari mengejar bunyi\nSampai fajar menyapa\n\nReff:\nNyalakan, nyalakan\nBiar malam ikut menari',
  10000, 180, 2026, '#a855f7', 'song-3.mp3', 'preview-3.mp3'),
 ('Rimba Raya', 4, 1, 4, 1,
  E'Di rimba raya kita bernyanyi\nAkar dan batu jadi saksi\nGitar menggema ke lembah sunyi\nBerlari bebas tanpa permisi\n\nReff:\nRimba raya, rimba raya\nSuaramu rumah kami',
  9500, 238, 2023, '#16a34a', 'song-4.mp3', 'preview-4.mp3'),
 ('Secangkir Kopi Pagi', 5, 2, 5, 2,
  E'Secangkir kopi, pagi yang pelan\nKoran terlipat di sudut meja\nPiano tua menyapa tetangga\nHari dimulai tanpa tergesa\n\nReff:\nSeruput saja, seruput saja\nDunia bisa menunggu',
  8500, 204, 2025, '#92400e', 'song-5.mp3', 'preview-5.mp3'),
 ('Layar Terkembang', 6, 3, 6, 3,
  E'Layar terkembang di tepi dermaga\nAngin selatan membawa kabar\nKami layari mimpi yang jauh\nBerbekal doa dan sebuah peta\n\nReff:\nBerlayarlah, berlayarlah\nPulau harapan menanti',
  9000, 226, 2024, '#0d9488', 'song-6.mp3', 'preview-6.mp3'),
 ('Malam Sunyi Bandung', 5, 2, 5, 1,
  E'Malam sunyi di Bandung kota\nKabut turun menyentuh atap\nSaksofon lirih di sudut kafe\nMenulis rindu tanpa alamat\n\nReff:\nSunyi ini indah\nBiarlah ia tinggal',
  8500, 247, 2023, '#475569', 'song-7.mp3', 'preview-7.mp3'),
 ('Gelombang Pasang', 4, 1, 4, 3,
  E'Gelombang pasang menghantam karang\nKita berdiri tak gentar\nDrum bertalu seperti jantung\nMenyambut badai dengan lantang\n\nReff:\nPasang, pasanglah\nKami tak akan surut',
  10000, 198, 2026, '#dc2626', 'song-8.mp3', 'preview-8.mp3');

INSERT INTO sales (invoice_no, user_id, customer_name, customer_email, total, status, payment_ref, created_at, paid_at) VALUES
 ('INV-20261005-0001', 3, 'Budi Santoso', 'budi@musicpedia.test', 9000,  'PAID',    'demo-pay-0001', '2026-10-05 13:00+07', '2026-10-05 13:01+07'),
 ('INV-20261012-0002', 3, 'Budi Santoso', 'budi@musicpedia.test', 10000, 'PAID',    'demo-pay-0002', '2026-10-12 19:30+07', '2026-10-12 19:31+07'),
 ('INV-20261020-0003', 2, 'Rani Kusuma',  'rani@musicpedia.test', 8000,  'PAID',    'demo-pay-0003', '2026-10-20 08:15+07', '2026-10-20 08:16+07'),
 ('INV-20261101-0004', 2, 'Rani Kusuma',  'rani@musicpedia.test', 8500,  'PENDING', 'demo-pay-0004', '2026-11-01 20:00+07', NULL);

INSERT INTO sale_items (sale_id, song_id, song_title, artist_name, price) VALUES
 (1, 1, 'Langit Senja',         'Sinta Maharani', 9000),
 (2, 3, 'Denyut Kota',          'Nadira Putri',   10000),
 (3, 2, 'Hujan di Ujung Jalan', 'Dimas Arya',     8000),
 (4, 5, 'Secangkir Kopi Pagi',  'Laras Wening',   8500);
