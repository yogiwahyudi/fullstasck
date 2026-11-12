import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, useDebounced } from '../hooks.js';
import SongCard from '../components/SongCard.jsx';
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui.jsx';

export default function CatalogPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const dq = useDebounced(q.trim(), 300);

  const genres = useAsync(() => api.genres(), []);
  const songs = useAsync(() => api.songs({ q: dq, genre }), [dq, genre]);
  const library = useAsync(
    () => (user?.role === 'CUSTOMER' ? api.library() : Promise.resolve({ songs: [] })),
    [user?.id],
  );
  const owned = new Set((library.data?.songs || []).map((s) => s.id));
  const list = songs.data?.songs;

  return (
    <>
      <PageHeader title="Katalog Lagu" subtitle="Cari lagu, dengarkan cuplikan, lalu beli untuk diunduh sebagai MP3." />
      <form role="search" className="mb-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          className="input flex-1"
          placeholder="Cari judul, penyanyi, pencipta, atau genre…"
          aria-label="Cari lagu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input sm:w-48" aria-label="Filter genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Semua genre</option>
          {(genres.data?.genres || []).map((g) => <option key={g}>{g}</option>)}
        </select>
      </form>

      {songs.loading && !list && <Loading label="Memuat lagu…" />}
      {songs.error && <ErrorBox error={songs.error} onRetry={songs.reload} />}
      {list && list.length === 0 && (
        <EmptyState title="Lagu tidak ditemukan">
          {dq || genre ? `Tidak ada lagu yang cocok${dq ? ` dengan “${dq}”` : ''}. Coba kata kunci lain atau hapus filter.` : 'Katalog masih kosong.'}
        </EmptyState>
      )}
      {list && list.length > 0 && (
        <>
          <p className="mb-3 text-sm text-slate-400" aria-live="polite">{list.length} lagu ditemukan</p>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${songs.loading ? 'opacity-60' : ''}`}>
            {list.map((s) => <SongCard key={s.id} song={s} owned={owned.has(s.id)} />)}
          </div>
        </>
      )}
    </>
  );
}
