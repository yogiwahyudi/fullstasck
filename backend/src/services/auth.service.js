import bcrypt from 'bcryptjs';
import { conflict, unauthorized } from '../errors.js';
import { Validator } from '../validate.js';
import * as userRepo from '../repositories/user.repository.js';

const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 10);
const publicUser = ({ id, email, role, fullName, phone, address }) => ({ id, email, role, fullName, phone, address });

/** Registrasi publik: peran selalu CUSTOMER, field "role" dari klien diabaikan. */
export async function register(input) {
  const v = new Validator(input)
    .email()
    .password()
    .string('fullName', 'Nama lengkap', { max: 120 })
    .string('phone', 'Telepon', { max: 30, required: false })
    .string('address', 'Alamat', { max: 255, required: false })
    .done();
  if (await userRepo.emailExists(v.email)) throw conflict('Email sudah terdaftar.');
  const id = await userRepo.createCustomer({
    email: v.email,
    passwordHash: await bcrypt.hash(v.password, 10),
    fullName: v.fullName,
    phone: v.phone,
    address: v.address,
  });
  return publicUser(await userRepo.findById(id));
}

export async function login(input) {
  const v = new Validator(input).email().string('password', 'Kata sandi', { max: 72 }).done();
  const user = await userRepo.findForLogin(v.email);
  const ok = await bcrypt.compare(v.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Email atau kata sandi salah.');
  if (!user.isActive) throw unauthorized('Akun dinonaktifkan.');
  return publicUser(user);
}

export const toPublicUser = publicUser;
