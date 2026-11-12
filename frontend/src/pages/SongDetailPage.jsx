import { Link, useParams } from 'react-router-dom';
import { api, duration, rupiah, urls } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync } from '../hooks.js';
import PlayButton from '../components/player.jsx';
import { Cover, ErrorBox, Loading } from '../components/ui.jsx';

export default function SongDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.song(id), [id]);
  const lib = useAsync(() => (user?.role === 'CUSTOMER' ? api.library() : Promise.resolve({ songs: [] })), [user?.id]);

  if (loading) return <Loading label="Memuat lagu…" />;
  if (error) {
    return error.status === 404
      ? <div className="card p-10 text-center"><h1 className="text-xl font-bold">Lagu tidak ditemukan</h1><Link to="/" className="btn btn-ghost mt-4">Kembali ke katalog</Link></div>
      : <ErrorBox error={error} onRetry={reload} />;
  }
  const s = data.song;
  const owned = (lib.data?.songs || []).some((x) => x.id === s.id);

  let action;
  if (!user) action = <Link to="/login" state={{ from: `/songs/${s.id}` }} className="btn btn-primary">Masuk untuk membeli</Link>;
  else if (user.role !== 'CUSTOMER') action = <p className="text-sm text-slate-400">Akun admin tidak dapat membeli lagu.</p>;
  else if (owned) action = <Link to="/dashboard?tab=library" className="btn btn-primary">✓ Sudah dimiliki — buka pustaka</Link>;
  else action = <Link to={`/checkout/${s.id}`} className="btn btn-primary">Beli {rupiah(s.price)}</Link>;

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <Cover color={s.coverColor} size="aspect-square w-full text-7xl" />
        {s.hasPreview && (
          <div className="card p-4">
            <PlayButton id={s.id} src={urls.preview(s.id)} label={s.title} fallbackTotal={10} />
          </div>
        )}
        <div className="card space-y-3 p-4">
          <p className="text-2xl font-bold text-emerald-400">{rupiah(s.price)}</p>
          {action}
        </div>
      </aside>
      <section>
        <Link to="/" className="text-sm text-slate-400 hover:text-white">← Katalog</Link>
        <h1 className="mt-2 text-3xl font-bold">{s.title}</h1>
        <p className="text-lg text-slate-300">{s.artist}</p>
        <dl className="card my-6 grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-3">
          {[['Genre', s.genre], ['Pencipta', s.composer], ['Label', s.label], ['Durasi', duration(s.durationSec)], ['Rilis', s.releaseYear]].map(([k, v]) => (
            <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
        <h2 className="mb-2 text-lg font-semibold">Lirik</h2>
        {s.lyrics ? <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-300">{s.lyrics}</pre> : <p className="text-sm text-slate-500">Lirik belum tersedia.</p>}
      </section>
    </div>
  );
}
