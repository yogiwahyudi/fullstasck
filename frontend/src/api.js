export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || {};
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.');
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* tubuh bukan JSON */
  }
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code || 'ERROR', e?.message || `Permintaan gagal (${res.status}).`, e?.details);
  }
  return data;
}

const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && sp.set(k, v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // auth
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),
  me: () => request('/auth/me'),
  // katalog
  songs: (p) => request(`/songs${qs(p)}`),
  genres: () => request('/songs/genres'),
  song: (id) => request(`/songs/${id}`),
  // pelanggan
  getProfile: (id) => request(`/customers/${id}/profile`),
  updateProfile: (id, b) => request(`/customers/${id}/profile`, { method: 'PUT', body: b }),
  createOrder: (songId) => request('/orders', { method: 'POST', body: { songId } }),
  payOrder: (id, b) => request(`/orders/${id}/pay`, { method: 'POST', body: b }),
  orders: () => request('/orders'),
  library: () => request('/library'),
  // admin
  adminDashboard: () => request('/admin/dashboard'),
  adminLookups: () => request('/admin/lookups'),
  adminSongs: (p) => request(`/admin/songs${qs(p)}`),
  adminSong: (id) => request(`/admin/songs/${id}`),
  adminSaveSong: (id, b) => (id ? request(`/admin/songs/${id}`, { method: 'PUT', body: b }) : request('/admin/songs', { method: 'POST', body: b })),
  adminDeleteSong: (id) => request(`/admin/songs/${id}`, { method: 'DELETE' }),
  adminCustomers: (p) => request(`/admin/customers${qs(p)}`),
  adminSaveCustomer: (id, b) => (id ? request(`/admin/customers/${id}`, { method: 'PUT', body: b }) : request('/admin/customers', { method: 'POST', body: b })),
  adminDeleteCustomer: (id) => request(`/admin/customers/${id}`, { method: 'DELETE' }),
  adminSales: (p) => request(`/admin/sales${qs(p)}`),
};

export const urls = {
  preview: (id) => `/api/songs/${id}/preview`,
  stream: (id) => `/api/songs/${id}/stream`,
  download: (id) => `/api/songs/${id}/download`,
  salesExport: (kind, p) => `/api/admin/sales/export.${kind}${qs(p)}`,
};

export const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
export const duration = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const dateTime = (d) => (d ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(d)) : '-');
