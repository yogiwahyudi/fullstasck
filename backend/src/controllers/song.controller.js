import { parseId } from '../validate.js';
import * as songService from '../services/song.service.js';

export const list = async (req, res) => res.json({ songs: await songService.list(req.query.q, req.query.genre) });
export const genres = async (req, res) => res.json({ genres: await songService.genres() });
export const detail = async (req, res) => res.json({ song: await songService.get(parseId(req.params.id)) });

const sendAudio = (res, file, name) =>
  new Promise((resolve, reject) => {
    const opts = { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' } };
    const done = (err) => (err ? reject(err) : resolve());
    if (name) res.download(file, name, opts, done);
    else res.sendFile(file, opts, done);
  });

export async function preview(req, res) {
  const file = await songService.previewPath(parseId(req.params.id));
  res.setHeader('Cache-Control', 'public, max-age=3600');
  await sendAudio(res, file);
}

export async function stream(req, res) {
  const { file } = await songService.fullAudio(req.user, parseId(req.params.id));
  await sendAudio(res, file);
}

export async function download(req, res) {
  const { file, downloadName } = await songService.fullAudio(req.user, parseId(req.params.id));
  await sendAudio(res, file, downloadName);
}

// ---- Admin ----
export const adminDetail = async (req, res) => res.json({ song: await songService.getForAdmin(parseId(req.params.id)) });
export const adminList = list;
export const adminCreate = async (req, res) => res.status(201).json({ song: await songService.create(req.body) });
export const adminUpdate = async (req, res) => res.json({ song: await songService.update(parseId(req.params.id), req.body) });
export async function adminRemove(req, res) {
  await songService.remove(parseId(req.params.id));
  res.status(204).end();
}
export const lookups = async (req, res) => res.json(await songService.lookups());
