import { parseId } from '../validate.js';
import * as service from '../services/customer.service.js';

export const getProfile = async (req, res) => res.json({ profile: await service.getOwnProfile(req.user, parseId(req.params.id)) });
export const updateProfile = async (req, res) =>
  res.json({ profile: await service.updateOwnProfile(req.user, parseId(req.params.id), req.body) });

// ---- Admin ----
export const adminList = async (req, res) => res.json({ customers: await service.adminList(req.query.q) });
export const adminGet = async (req, res) => res.json({ customer: await service.adminGet(parseId(req.params.id)) });
export const adminCreate = async (req, res) => res.status(201).json({ customer: await service.adminCreate(req.body) });
export const adminUpdate = async (req, res) => res.json({ customer: await service.adminUpdate(parseId(req.params.id), req.body) });
export async function adminRemove(req, res) {
  await service.adminRemove(parseId(req.params.id));
  res.status(204).end();
}
