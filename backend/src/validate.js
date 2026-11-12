import { badRequest } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Kumpulkan kesalahan per field lalu lempar satu 400. */
export class Validator {
  constructor(input) {
    this.input = input && typeof input === 'object' ? input : {};
    this.errors = {};
    this.values = {};
  }

  fail(field, msg) {
    if (!this.errors[field]) this.errors[field] = msg;
  }

  string(field, label, { min = 1, max = 255, required = true } = {}) {
    let v = this.input[field];
    if (v === undefined || v === null || v === '') {
      if (required) this.fail(field, `${label} wajib diisi.`);
      this.values[field] = required ? undefined : '';
      return this;
    }
    if (typeof v !== 'string') { this.fail(field, `${label} harus berupa teks.`); return this; }
    v = v.trim();
    if (required && v.length < min) this.fail(field, `${label} minimal ${min} karakter.`);
    else if (v.length > max) this.fail(field, `${label} maksimal ${max} karakter.`);
    this.values[field] = v;
    return this;
  }

  email(field = 'email', label = 'Email') {
    this.string(field, label, { max: 150 });
    const v = this.values[field];
    if (v && !EMAIL_RE.test(v)) this.fail(field, `${label} tidak valid.`);
    if (v) this.values[field] = v.toLowerCase();
    return this;
  }

  password(field = 'password', label = 'Kata sandi', { required = true } = {}) {
    const v = this.input[field];
    if ((v === undefined || v === '') && !required) return this;
    if (typeof v !== 'string' || v.length < 8) this.fail(field, `${label} minimal 8 karakter.`);
    else if (v.length > 72) this.fail(field, `${label} maksimal 72 karakter.`);
    else this.values[field] = v;
    return this;
  }

  int(field, label, { min = 0, max = 2147483647 } = {}) {
    const raw = this.input[field];
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (!Number.isInteger(n)) this.fail(field, `${label} harus berupa bilangan bulat.`);
    else if (n < min || n > max) this.fail(field, `${label} harus antara ${min} dan ${max}.`);
    else this.values[field] = n;
    return this;
  }

  bool(field, fallback) {
    const v = this.input[field];
    this.values[field] = typeof v === 'boolean' ? v : fallback;
    return this;
  }

  done() {
    if (Object.keys(this.errors).length) throw badRequest('Data yang dikirim tidak valid.', this.errors);
    return this.values;
  }
}

export function parseId(value, label = 'ID') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${label} tidak valid.`);
  return n;
}

/** Parameter tanggal YYYY-MM-DD opsional (kosong => undefined). */
export function parseDate(value, label) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${label} harus berformat YYYY-MM-DD.`);
  }
  return value;
}
