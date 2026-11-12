import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { duration } from '../api.js';

const PlayerContext = createContext(null);
const IDLE = { key: null, playing: false, loading: false, error: null, current: 0, total: 0 };

/** Satu elemen <audio> bersama: memutar item baru otomatis menghentikan item sebelumnya. */
export function PlayerProvider({ children, audioFactory = () => new Audio() }) {
  const audio = useRef(null);
  const keyRef = useRef(null);
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    const a = audioFactory();
    a.preload = 'none';
    audio.current = a;
    const on = (ev, fn) => a.addEventListener(ev, fn);
    on('loadstart', () => setState((s) => ({ ...s, loading: true, error: null })));
    on('playing', () => setState((s) => ({ ...s, playing: true, loading: false })));
    on('pause', () => setState((s) => ({ ...s, playing: false })));
    on('waiting', () => setState((s) => ({ ...s, loading: true })));
    on('canplay', () => setState((s) => ({ ...s, loading: false })));
    on('timeupdate', () => setState((s) => ({ ...s, current: a.currentTime })));
    on('durationchange', () => setState((s) => ({ ...s, total: Number.isFinite(a.duration) ? a.duration : 0 })));
    on('ended', () => setState((s) => ({ ...s, playing: false, current: 0 })));
    on('error', () => setState((s) => ({ ...s, playing: false, loading: false, error: 'Audio tidak dapat diputar.' })));
    return () => { a.pause(); a.removeAttribute('src'); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback((key, src) => {
    const a = audio.current;
    if (!a) return;
    if (keyRef.current === key && a.src) {
      if (a.paused) a.play().catch(() => {}); else a.pause();
      return;
    }
    keyRef.current = key;
    a.pause();
    a.src = src;
    setState({ ...IDLE, key, loading: true });
    a.play().catch((e) => {
      if (e?.name !== 'AbortError') setState((s) => ({ ...s, loading: false, playing: false, error: 'Audio tidak dapat diputar.' }));
    });
  }, []);

  const value = useMemo(() => ({ state, toggle }), [state, toggle]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(key) {
  const { state, toggle } = useContext(PlayerContext);
  const active = state.key === key;
  return {
    active,
    playing: active && state.playing,
    loading: active && state.loading,
    error: active ? state.error : null,
    current: active ? state.current : 0,
    total: active ? state.total : 0,
    toggle,
  };
}

/** Tombol play/pause + indikator progres. `fallbackTotal` dipakai sebelum metadata audio dimuat. */
export default function PlayButton({ id, kind = 'preview', src, label, fallbackTotal = 0 }) {
  const key = `${kind}:${id}`;
  const p = usePlayer(key);
  const total = p.total || fallbackTotal;
  const pct = total ? Math.min(100, (p.current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="btn btn-primary h-9 w-9 shrink-0 rounded-full !p-0"
        aria-label={`${p.playing ? 'Jeda' : 'Putar'} ${label}`}
        onClick={() => p.toggle(key, src)}
      >
        {p.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : p.playing ? '❚❚' : '▶'}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="progressbar"
          aria-label={`Progres ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="h-1.5 overflow-hidden rounded-full bg-slate-700"
        >
          <div className="h-full bg-brand-400 transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-500">
          <span>{duration(p.current)}</span>
          {p.error ? <span className="text-rose-400">{p.error}</span> : <span>{kind === 'preview' ? 'Cuplikan' : 'Lagu penuh'}</span>}
          <span>{total ? duration(total) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}
