import { Link } from 'react-router-dom';
import { duration, rupiah, urls } from '../api.js';
import { Cover } from './ui.jsx';
import PlayButton from './player.jsx';

export default function SongCard({ song, owned }) {
  return (
    <article className="card flex flex-col gap-4 p-4 transition hover:border-slate-700">
      <div className="flex gap-3">
        <Cover color={song.coverColor} size="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link to={`/songs/${song.id}`} className="hover:text-brand-400">{song.title}</Link>
          </h3>
          <p className="truncate text-sm text-slate-400">{song.artist}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-800 px-1.5 py-0.5">{song.genre}</span>
            <span>{duration(song.durationSec)}</span>
            <span>{song.releaseYear}</span>
          </div>
        </div>
      </div>
      {song.hasPreview ? (
        <PlayButton id={song.id} src={urls.preview(song.id)} label={song.title} fallbackTotal={10} />
      ) : (
        <p className="text-xs text-slate-500">Cuplikan belum tersedia.</p>
      )}
      <div className="mt-auto flex items-center justify-between">
        <span className="font-semibold text-emerald-400">{rupiah(song.price)}</span>
        {owned ? (
          <Link to="/dashboard?tab=library" className="btn btn-ghost !py-1.5">✓ Dimiliki</Link>
        ) : (
          <Link to={`/songs/${song.id}`} className="btn btn-ghost !py-1.5">Detail</Link>
        )}
      </div>
    </article>
  );
}
