import { parseId } from '../validate.js';
import { badRequest } from '../errors.js';
import * as orderService from '../services/order.service.js';

export async function create(req, res) {
  const songId = Number(req.body?.songId);
  if (!Number.isInteger(songId) || songId <= 0) throw badRequest('Lagu wajib dipilih.', { songId: 'Lagu wajib dipilih.' });
  res.status(201).json({ order: await orderService.create(req.user, songId) });
}

export async function pay(req, res) {
  res.json(await orderService.pay(req.user, parseId(req.params.id), req.body));
}

export const history = async (req, res) => res.json({ orders: await orderService.history(req.user) });
export const library = async (req, res) => res.json({ songs: await orderService.library(req.user) });
