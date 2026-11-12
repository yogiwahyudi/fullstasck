import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { Validator } from '../validate.js';
import * as songRepo from '../repositories/song.repository.js';
import * as orderRepo from '../repositories/order.repository.js';

export const list = (q, genre) => songRepo.list({ q: q?.trim() || undefined, genre: genre?.trim() || undefined });
export const genres = () => songRepo.listGenres();
export const lookups = () => songRepo.lookups();

export async function get(id) {
  const song = await songRepo.findById(id, { withLyrics: true });
  if (!song) throw notFound('Lagu tidak ditemukan.');
  return song;
}

export async function getForAdmin(id) {
  const song = await songRepo.findById(id, { withLyrics: true, withFiles: true });
  if (!song) throw notFound('Lagu tidak ditemukan.');
  return song;
}

const FILE_RE = /^[A-Za-z0-9._-]+\.mp3$/;

function fileExists(dir, name) {
  return FILE_RE.test(name) && fs.existsSync(path.join(config.storageDir, dir, name));
}

function songInput(input) {
  const val = new Validator(input)
    .string('title', 'Judul', { max: 150 })
    .string('genre', 'Genre', { max: 80 })
    .string('artist', 'Penyanyi', { max: 120 })
    .string('composer', 'Pencipta', { max: 120 })
    .string('label', 'Label rekaman', { max: 120 })
    .string('lyrics', 'Lirik', { max: 10000, required: false })
    .int('price', 'Harga', { min: 1, max: 10000000 })
    .int('durationSec', 'Durasi (detik)', { min: 1, max: 3600 })
    .int('releaseYear', 'Tahun rilis', { min: 1900, max: 2100 })
    .string('coverColor', 'Warna sampul', { max: 7, required: false })
    .string('audioFile', 'File audio penuh', { max: 120, required: false })
    .string('previewFile', 'File cuplikan', { max: 120, required: false });
  const v = val.values; // pemeriksaan tambahan dulu, baru done() melempar semua kesalahan sekaligus
  if (v.coverColor && !/^#[0-9a-fA-F]{6}$/.test(v.coverColor)) val.fail('coverColor', 'Warna sampul harus berformat #RRGGBB.');
  v.coverColor = v.coverColor || '#6366f1';
  if (v.audioFile && !fileExists('audio', v.audioFile)) val.fail('audioFile', 'File audio tidak ditemukan di storage/audio.');
  if (v.previewFile && !fileExists('previews', v.previewFile)) val.fail('previewFile', 'File cuplikan tidak ditemukan di storage/previews.');
  return val.done();
}

export async function create(input) {
  return getForAdmin(await songRepo.create(songInput(input)));
}

export async function update(id, input) {
  await getForAdmin(id);
  await songRepo.update(id, songInput(input));
  return getForAdmin(id);
}

export async function remove(id) {
  await getForAdmin(id);
  await songRepo.remove(id);
}

/** Cuplikan bersifat publik. Mengembalikan path absolut file. */
export async function previewPath(id) {
  const song = await songRepo.findById(id, { withFiles: true });
  if (!song) throw notFound('Lagu tidak ditemukan.');
  if (!song.previewFile || !fileExists('previews', song.previewFile)) throw notFound('Cuplikan belum tersedia.');
  return path.join(config.storageDir, 'previews', song.previewFile);
}

/** File penuh hanya untuk pelanggan yang sudah membeli (PAID). */
export async function fullAudio(user, id) {
  const song = await songRepo.findById(id, { withFiles: true });
  if (!song) throw notFound('Lagu tidak ditemukan.');
  if (user.role !== 'CUSTOMER' || !(await orderRepo.ownsSong(user.id, id))) {
    throw forbidden('Anda belum membeli lagu ini.');
  }
  if (!song.audioFile || !fileExists('audio', song.audioFile)) throw badRequest('File audio belum tersedia.');
  return { file: path.join(config.storageDir, 'audio', song.audioFile), downloadName: `${song.artist} - ${song.title}.mp3`.replace(/[\\/:*?"<>|]/g, '_') };
}
