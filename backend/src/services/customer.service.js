import bcrypt from 'bcryptjs';
import { conflict, forbidden, notFound } from '../errors.js';
import { Validator } from '../validate.js';
import * as customerRepo from '../repositories/customer.repository.js';
import * as userRepo from '../repositories/user.repository.js';

const strip = ({ id, email, isActive, createdAt, fullName, phone, address }) => ({ id, email, isActive, createdAt, fullName, phone, address });

const profileInput = (input) =>
  new Validator(input)
    .string('fullName', 'Nama lengkap', { max: 120 })
    .string('phone', 'Telepon', { max: 30, required: false })
    .string('address', 'Alamat', { max: 255, required: false });

/** Pelanggan hanya boleh melihat/mengubah profilnya sendiri. */
function assertSelf(actor, id) {
  if (actor.role !== 'CUSTOMER' || actor.id !== id) throw forbidden('Anda hanya dapat mengakses profil Anda sendiri.');
}

export async function getOwnProfile(actor, id) {
  assertSelf(actor, id);
  return strip(await customerRepo.findById(id));
}

export async function updateOwnProfile(actor, id, input) {
  assertSelf(actor, id);
  const v = profileInput(input).done();
  await customerRepo.updateProfile(id, v);
  return strip(await customerRepo.findById(id));
}

// ---- Admin ----
export const adminList = async (q) => (await customerRepo.list(q?.trim() || undefined)).map(strip);

export async function adminGet(id) {
  const c = await customerRepo.findById(id);
  if (!c) throw notFound('Pelanggan tidak ditemukan.');
  return strip(c);
}

export async function adminCreate(input) {
  const v = profileInput(input).email().password().done();
  if (await userRepo.emailExists(v.email)) throw conflict('Email sudah terdaftar.');
  const id = await userRepo.createCustomer({ ...v, passwordHash: await bcrypt.hash(v.password, 10) });
  return adminGet(id);
}

export async function adminUpdate(id, input) {
  await adminGet(id);
  const v = profileInput(input).email().password('password', 'Kata sandi', { required: false }).bool('isActive', true).done();
  if (await userRepo.emailExists(v.email, id)) throw conflict('Email sudah terdaftar.');
  await customerRepo.adminUpdate(id, { ...v, passwordHash: v.password ? await bcrypt.hash(v.password, 10) : null });
  return adminGet(id);
}

export async function adminRemove(id) {
  await adminGet(id);
  await customerRepo.remove(id);
}
