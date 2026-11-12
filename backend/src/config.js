import path from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.env;
const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number(env.PORT || 3000),
  databaseUrl: env.DATABASE_URL || 'postgres://musicpedia:musicpedia@localhost:5432/musicpedia',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  cookieName: 'mp_session',
  cookieSecure: env.COOKIE_SECURE === 'true',
  sessionHours: 8,
  storageDir: path.resolve(here, '..', 'storage'),
};

if (config.nodeEnv === 'production' && config.jwtSecret.length < 16) {
  throw new Error('JWT_SECRET wajib diatur (minimal 16 karakter) pada mode production.');
}
