import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../errors.js';
import * as userRepo from '../repositories/user.repository.js';

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: `${config.sessionHours}h` });
}

export function setSessionCookie(res, user) {
  res.cookie(config.cookieName, signSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 3600 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** Wajib login. Pengguna dimuat ulang dari DB agar akun yang dihapus/nonaktif langsung ditolak. */
export async function authenticate(req, res, next) {
  const token = readCookie(req, config.cookieName);
  if (!token) return next(unauthorized());
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(unauthorized('Sesi tidak valid atau telah berakhir.'));
  }
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.isActive) return next(unauthorized('Akun tidak ditemukan atau dinonaktifkan.'));
  req.user = user;
  next();
}

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : next(forbidden('Hanya untuk peran ' + role + '.'));
