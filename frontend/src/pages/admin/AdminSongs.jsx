import { useState } from 'react';
import { api, duration, rupiah } from '../../api.js';
import { useAsync, useDebounced } from '../../hooks.js';
import { Alert, EmptyState, ErrorBox, Field, Loading, PageHeader } from '../../components/ui.jsx';

const EMPTY = {
  title: '', genre: '', artist: '', composer: '', label: '', lyrics: '', price: '', durationSec: '', releaseYear: new Date().getFullYear(),
  coverColor: '#6366f1', audioFile: '', previewFile: '',
};

export default function AdminSongs() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, loading, error, reload } = useAsync(() => api.adminSongs({ q: dq }), [dq]);
  const lookups = useAsync(() => api.adminLookups(), []);
  const [editing, setEditing] = useState(null); // null | 'new' | song
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const remove = async (s) => {
    if (!window.confirm(`Hapus lagu “${s.title}”? Histori penjualan tetap tersimpan.`)) return;
    setActionError(''); setNotice('');
    try { await api.adminDeleteSong(s.id); setNotice('Lagu dihapus.'); reload(); } catch (e) { setActionError(e.message); }
  };
  const edit = async (s) => {
    setActionError('');
    try { setEditing((await api.adminSong(s.id)).song); } catch (e) { setActionError(e.message); }
  };

  return (
    <>
      <PageHeader title="Kelola Lagu" actions={<button className="btn btn-primary" onClick={() => { setNotice(''); setEditing('new'); }}>+ Tambah lagu</button>} />
      <input className="input mb-4 max-w-sm" type="search" placeholder="Cari lagu…" aria-label="Cari lagu" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-4 space-y-2"><Alert kind="success">{notice}</Alert><Alert>{actionError}</Alert></div>

      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && !data.songs.length && <EmptyState title="Belum ada lagu">{dq ? 'Tidak ada lagu yang cocok dengan pencarian.' : 'Tambahkan lagu pertama Anda.'}</EmptyState>}
      {data?.songs.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Judul</th><th className="th">Penyanyi</th><th className="th">Genre</th><th className="th">Durasi</th><th className="th">Harga</th><th className="th">Audio</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {data.songs.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.title}</td>
                  <td className="td">{s.artist}</td>
                  <td className="td">{s.genre}</td>
                  <td className="td">{duration(s.durationSec)}</td>
                  <td className="td">{rupiah(s.price)}</td>
                  <td className="td text-xs text-slate-400">{s.hasAudio ? 'Penuh' : '—'} / {s.hasPreview ? 'Cuplikan' : '—'}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn btn-ghost !py-1" onClick={() => edit(s)}>Ubah</button>{' '}
                    <button className="btn btn-danger !py-1" onClick={() => remove(s)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SongForm
          song={editing === 'new' ? null : editing}
          lookups={lookups.data}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setNotice(msg); reload(); lookups.reload(); }}
        />
      )}
    </>
  );
}

function SongForm({ song, lookups, onClose, onSaved }) {
  const [f, setF] = useState(song ? { ...EMPTY, ...song, audioFile: song.audioFile || '', previewFile: song.previewFile || '' } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const d = err?.details || {};
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.adminSaveSong(song?.id, f);
      onSaved(song ? 'Lagu diperbarui.' : 'Lagu ditambahkan.');
    } catch (x) { setErr(x); setBusy(false); }
  };
  const list = (id, items) => <datalist id={id}>{(items || []).map((i) => <option key={i} value={i} />)}</datalist>;
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={song ? 'Ubah lagu' : 'Tambah lagu'}>
      <form onSubmit={submit} noValidate className="card my-8 w-full max-w-2xl space-y-4 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">{song ? 'Ubah lagu' : 'Tambah lagu'}</h2>
        <Alert>{err && !Object.keys(d).length ? err.message : err && 'Periksa kembali isian formulir.'}</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul" error={d.title}><input className="input" value={f.title} onChange={set('title')} /></Field>
          <Field label="Penyanyi" error={d.artist}><input className="input" list="dl-artists" value={f.artist} onChange={set('artist')} /></Field>
          <Field label="Pencipta" error={d.composer}><input className="input" list="dl-composers" value={f.composer} onChange={set('composer')} /></Field>
          <Field label="Genre" error={d.genre}><input className="input" list="dl-genres" value={f.genre} onChange={set('genre')} /></Field>
          <Field label="Label rekaman" error={d.label}><input className="input" list="dl-labels" value={f.label} onChange={set('label')} /></Field>
          <Field label="Harga (Rp)" error={d.price}><input className="input" type="number" min="1" value={f.price} onChange={set('price')} /></Field>
          <Field label="Durasi (detik)" error={d.durationSec}><input className="input" type="number" min="1" value={f.durationSec} onChange={set('durationSec')} /></Field>
          <Field label="Tahun rilis" error={d.releaseYear}><input className="input" type="number" value={f.releaseYear} onChange={set('releaseYear')} /></Field>
          <Field label="Warna sampul" error={d.coverColor}><input className="input h-10 p-1" type="color" value={f.coverColor} onChange={set('coverColor')} /></Field>
          <span />
          <Field label="File audio penuh" error={d.audioFile} hint="Nama file MP3 di backend/storage/audio, mis. song-1.mp3"><input className="input" value={f.audioFile} onChange={set('audioFile')} /></Field>
          <Field label="File cuplikan" error={d.previewFile} hint="Nama file MP3 di backend/storage/previews"><input className="input" value={f.previewFile} onChange={set('previewFile')} /></Field>
        </div>
        <Field label="Lirik" error={d.lyrics}><textarea className="input min-h-32" value={f.lyrics} onChange={set('lyrics')} /></Field>
        {list('dl-artists', lookups?.artists)}{list('dl-composers', lookups?.composers)}{list('dl-genres', lookups?.genres)}{list('dl-labels', lookups?.labels)}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}
