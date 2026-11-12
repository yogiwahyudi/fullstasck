import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, dateTime, rupiah, urls } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync } from '../hooks.js';
import PlayButton from '../components/player.jsx';
import { Alert, Cover, EmptyState, ErrorBox, Field, Loading, PageHeader } from '../components/ui.jsx';

const TABS = [['profile', 'Profil'], ['library', 'Pustaka Saya'], ['history', 'Riwayat Pembelian']];

export default function DashboardPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'profile';
  return (
    <>
      <PageHeader title={`Halo, ${user.fullName || user.email}`} subtitle="Kelola profil, putar lagu yang Anda miliki, dan lihat riwayat pembelian." />
      <div role="tablist" className="mb-6 flex gap-1 border-b border-slate-800">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setParams({ tab: k })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'library' && <LibraryTab />}
      {tab === 'history' && <HistoryTab />}
    </>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.getProfile(user.id), [user.id]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setForm({ fullName: data.profile.fullName, phone: data.profile.phone, address: data.profile.address }); }, [data]);

  if (loading || !form) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />;
  const d = saveError?.details || {};
  const set = (k) => (e) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      const r = await api.updateProfile(user.id, form);
      setUser({ ...user, ...r.profile });
      setSaved(true);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="card max-w-lg space-y-4 p-6" noValidate>
      <Alert>{saveError && !Object.keys(d).length ? saveError.message : saveError && 'Periksa kembali isian formulir.'}</Alert>
      <Alert kind="success">{saved && 'Profil berhasil disimpan.'}</Alert>
      <Field label="Email"><input className="input opacity-70" value={data.profile.email} disabled readOnly /></Field>
      <Field label="Nama lengkap" error={d.fullName}><input className="input" value={form.fullName} onChange={set('fullName')} /></Field>
      <Field label="Telepon" error={d.phone}><input className="input" value={form.phone} onChange={set('phone')} /></Field>
      <Field label="Alamat" error={d.address}><input className="input" value={form.address} onChange={set('address')} /></Field>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button>
    </form>
  );
}

function LibraryTab() {
  const { data, loading, error, reload } = useAsync(() => api.library(), []);
  if (loading) return <Loading label="Memuat pustaka…" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data.songs.length) {
    return <EmptyState title="Pustaka masih kosong">Beli lagu dari <Link to="/" className="text-brand-400 underline">katalog</Link> untuk memutar dan mengunduhnya di sini.</EmptyState>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.songs.map((s) => (
        <article key={s.id} className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Cover color={s.coverColor} />
            <div className="min-w-0 flex-1">
              <Link to={`/songs/${s.id}`} className="block truncate font-semibold hover:text-brand-400">{s.title}</Link>
              <p className="truncate text-sm text-slate-400">{s.artist}</p>
              <p className="text-xs text-slate-500">Dibeli {dateTime(s.purchasedAt)}</p>
            </div>
            <a className="btn btn-primary" href={urls.download(s.id)} download>⬇ Unduh MP3</a>
          </div>
          <PlayButton id={s.id} kind="full" src={urls.stream(s.id)} label={s.title} fallbackTotal={s.durationSec} />
        </article>
      ))}
    </div>
  );
}

const STATUS = { PAID: ['Lunas', 'bg-emerald-900/60 text-emerald-300'], PENDING: ['Menunggu', 'bg-amber-900/60 text-amber-300'], FAILED: ['Gagal', 'bg-rose-900/60 text-rose-300'] };

function HistoryTab() {
  const { data, loading, error, reload } = useAsync(() => api.orders(), []);
  if (loading) return <Loading label="Memuat riwayat…" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data.orders.length) return <EmptyState title="Belum ada pembelian">Riwayat pembelian akan tampil di sini.</EmptyState>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead><tr><th className="th">Invoice</th><th className="th">Tanggal</th><th className="th">Lagu</th><th className="th">Harga</th><th className="th">Status</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-slate-800">
          {data.orders.map((o) => (
            <tr key={o.id}>
              <td className="td font-mono text-xs">{o.invoiceNo}</td>
              <td className="td">{dateTime(o.paidAt || o.createdAt)}</td>
              <td className="td">{o.songTitle}<span className="block text-xs text-slate-500">{o.artistName}</span></td>
              <td className="td">{rupiah(o.price)}</td>
              <td className="td"><span className={`rounded px-2 py-0.5 text-xs ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span></td>
              <td className="td text-right">{o.status === 'PENDING' && o.songId && <Link className="btn btn-ghost !py-1" to={`/checkout/${o.songId}`}>Bayar</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
