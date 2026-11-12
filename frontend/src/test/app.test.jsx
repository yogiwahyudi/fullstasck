import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../auth.jsx';
import { PlayerProvider } from '../components/player.jsx';
import { api, ApiError } from '../api.js';

const song = (id, title) => ({ id, title, artist: 'Penyanyi', genre: 'Pop', price: 9000, durationSec: 120, releaseYear: 2025, coverColor: '#f97316', hasPreview: true, hasAudio: true });
const json = (status, body) => Promise.resolve(new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** Router fetch palsu berdasarkan path. */
function mockApi(routes) {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const u = String(url);
    for (const [prefix, handler] of Object.entries(routes)) if (u.startsWith(prefix)) return handler(u);
    return json(404, { error: { message: 'tidak ada' } });
  }));
}

function renderApp(path = '/', audioFactory) {
  const fakeAudio = audioFactory || (() => Object.assign(new EventTarget(), { pause: vi.fn(), play: vi.fn(() => Promise.resolve()), removeAttribute: vi.fn(), paused: true, src: '' }));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <PlayerProvider audioFactory={fakeAudio}><App /></PlayerProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Katalog', () => {
  it('menampilkan daftar lagu untuk pengunjung', async () => {
    mockApi({
      '/api/auth/me': () => json(401, { error: { message: 'x' } }),
      '/api/songs/genres': () => json(200, { genres: ['Pop'] }),
      '/api/songs': () => json(200, { songs: [song(1, 'Langit Senja'), song(2, 'Denyut Kota')] }),
    });
    renderApp();
    expect(await screen.findByText('Langit Senja')).toBeInTheDocument();
    expect(screen.getByText('2 lagu ditemukan')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('menampilkan kondisi kosong ketika pencarian tanpa hasil', async () => {
    mockApi({
      '/api/auth/me': () => json(401, {}),
      '/api/songs/genres': () => json(200, { genres: [] }),
      '/api/songs': () => json(200, { songs: [] }),
    });
    renderApp();
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Lagu tidak ditemukan')).toBeInTheDocument();
  });

  it('mengirim kata kunci pencarian ke API', async () => {
    mockApi({
      '/api/auth/me': () => json(401, {}),
      '/api/songs/genres': () => json(200, { genres: [] }),
      '/api/songs': () => json(200, { songs: [] }),
    });
    renderApp();
    await screen.findByTestId('empty-state');
    fireEvent.change(screen.getByLabelText('Cari lagu'), { target: { value: 'hujan' } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/songs?q=hujan', expect.anything()), { timeout: 2000 });
  });

  it('menampilkan kegagalan request dengan tombol coba lagi', async () => {
    mockApi({
      '/api/auth/me': () => json(401, {}),
      '/api/songs/genres': () => json(200, { genres: [] }),
      '/api/songs': () => json(500, { error: { message: 'Terjadi kesalahan pada server.' } }),
    });
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan pada server.');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });
});

describe('Cuplikan', () => {
  it('play lalu pause pada tombol', async () => {
    const audio = Object.assign(new EventTarget(), { pause: vi.fn(), play: vi.fn(() => Promise.resolve()), removeAttribute: vi.fn(), paused: true, src: '' });
    mockApi({
      '/api/auth/me': () => json(401, {}),
      '/api/songs/genres': () => json(200, { genres: [] }),
      '/api/songs': () => json(200, { songs: [song(1, 'Langit Senja')] }),
    });
    renderApp('/', () => audio);
    fireEvent.click(await screen.findByRole('button', { name: /Putar Langit Senja/ }));
    expect(audio.src).toBe('/api/songs/1/preview');
    expect(audio.play).toHaveBeenCalled();
    audio.dispatchEvent(new Event('playing'));
    expect(await screen.findByRole('button', { name: /Jeda Langit Senja/ })).toBeInTheDocument();
    audio.dispatchEvent(new Event('pause'));
    expect(await screen.findByRole('button', { name: /Putar Langit Senja/ })).toBeInTheDocument();
  });
});

describe('Rute terlindungi', () => {
  it('mengarahkan pengunjung ke halaman masuk', async () => {
    mockApi({ '/api/auth/me': () => json(401, {}) });
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('menolak pelanggan di halaman admin', async () => {
    mockApi({ '/api/auth/me': () => json(200, { user: { id: 2, email: 'r@x.test', role: 'CUSTOMER', fullName: 'Rani' } }) });
    renderApp('/admin');
    expect(await screen.findByText('Akses ditolak')).toBeInTheDocument();
  });

  it('mengirim error validasi login ke formulir', async () => {
    mockApi({
      '/api/auth/me': () => json(401, {}),
      '/api/auth/login': () => json(401, { error: { code: 'UNAUTHENTICATED', message: 'Email atau kata sandi salah.' } }),
    });
    renderApp('/login');
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'salahsalah' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau kata sandi salah.');
  });
});

describe('Klien API', () => {
  it('memetakan kegagalan jaringan ke ApiError NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('failed'))));
    await expect(api.songs()).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
    await expect(api.songs()).rejects.toBeInstanceOf(ApiError);
  });

  it('membawa details validasi dari server', async () => {
    mockApi({ '/api/auth/register': () => json(400, { error: { code: 'VALIDATION_ERROR', message: 'tidak valid', details: { email: 'Email tidak valid.' } } }) });
    await expect(api.register({})).rejects.toMatchObject({ status: 400, details: { email: 'Email tidak valid.' } });
  });
});
