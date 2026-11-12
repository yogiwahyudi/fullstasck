import * as authService from '../services/auth.service.js';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';

export async function register(req, res) {
  const user = await authService.register(req.body);
  setSessionCookie(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const user = await authService.login(req.body);
  setSessionCookie(res, user);
  res.json({ user });
}

export function logout(req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: authService.toPublicUser(req.user) });
}
