import { query, withTransaction } from '../db.js';

const SELECT = `
  SELECT s.id, s.title, s.price, s.duration_sec, s.release_year, s.cover_color, s.lyrics,
         s.audio_file, s.preview_file,
         g.name AS genre, a.name AS artist, c.name AS composer, l.name AS label
  FROM songs s
  JOIN genres g ON g.id = s.genre_id
  JOIN artists a ON a.id = s.artist_id
  JOIN composers c ON c.id = s.composer_id
  JOIN record_labels l ON l.id = s.label_id`;

export const toSong = (r, { withLyrics = false, withFiles = false } = {}) =>
  r && {
    id: r.id,
    title: r.title,
    price: r.price,
    durationSec: r.duration_sec,
    releaseYear: r.release_year,
    coverColor: r.cover_color,
    genre: r.genre,
    artist: r.artist,
    composer: r.composer,
    label: r.label,
    hasPreview: Boolean(r.preview_file),
    hasAudio: Boolean(r.audio_file),
    ...(withLyrics && { lyrics: r.lyrics }),
    ...(withFiles && { audioFile: r.audio_file, previewFile: r.preview_file }),
  };

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export async function list({ q, genre } = {}) {
  const like = q ? `%${escapeLike(q)}%` : null;
  const { rows } = await query(
    `${SELECT}
     WHERE ($1::text IS NULL OR s.title ILIKE $1 OR a.name ILIKE $1 OR c.name ILIKE $1 OR g.name ILIKE $1)
       AND ($2::text IS NULL OR g.name = $2)
     ORDER BY s.title, s.id`,
    [like, genre || null],
  );
  return rows.map((r) => toSong(r));
}

export async function findById(id, opts) {
  const { rows } = await query(`${SELECT} WHERE s.id = $1`, [id]);
  return toSong(rows[0], opts);
}

export async function listGenres() {
  const { rows } = await query('SELECT name FROM genres ORDER BY name');
  return rows.map((r) => r.name);
}

export async function lookups() {
  const names = async (t) => (await query(`SELECT name FROM ${t} ORDER BY name`)).rows.map((r) => r.name);
  return {
    genres: await names('genres'),
    labels: await names('record_labels'),
    artists: await names('artists'),
    composers: await names('composers'),
  };
}

async function upsertName(client, table, name) {
  const { rows } = await client.query(
    `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name],
  );
  return rows[0].id;
}

async function resolveRefs(client, d) {
  return {
    genreId: await upsertName(client, 'genres', d.genre),
    labelId: await upsertName(client, 'record_labels', d.label),
    artistId: await upsertName(client, 'artists', d.artist),
    composerId: await upsertName(client, 'composers', d.composer),
  };
}

export function create(d) {
  return withTransaction(async (client) => {
    const ref = await resolveRefs(client, d);
    const { rows } = await client.query(
      `INSERT INTO songs (title, genre_id, label_id, artist_id, composer_id, lyrics, price, duration_sec, release_year, cover_color, audio_file, preview_file)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [d.title, ref.genreId, ref.labelId, ref.artistId, ref.composerId, d.lyrics, d.price, d.durationSec, d.releaseYear, d.coverColor, d.audioFile || null, d.previewFile || null],
    );
    return rows[0].id;
  });
}

export function update(id, d) {
  return withTransaction(async (client) => {
    const ref = await resolveRefs(client, d);
    await client.query(
      `UPDATE songs SET title=$2, genre_id=$3, label_id=$4, artist_id=$5, composer_id=$6, lyrics=$7, price=$8,
         duration_sec=$9, release_year=$10, cover_color=$11, audio_file=$12, preview_file=$13 WHERE id=$1`,
      [id, d.title, ref.genreId, ref.labelId, ref.artistId, ref.composerId, d.lyrics, d.price, d.durationSec, d.releaseYear, d.coverColor, d.audioFile || null, d.previewFile || null],
    );
  });
}

/** sale_items.song_id menjadi NULL; judul/penyanyi/harga di sale_items tetap sebagai histori. */
export async function remove(id) {
  await query('DELETE FROM songs WHERE id = $1', [id]);
}
