export function Loading({ label = 'Memuat…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="empty-state">
      <div className="text-4xl" aria-hidden="true">🎧</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-slate-400">{children}</p>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 border-rose-900 bg-rose-950/30 px-6 py-10 text-center">
      <p className="font-semibold text-rose-300">Terjadi kesalahan</p>
      <p className="max-w-md text-sm text-rose-200/80">{error?.message || 'Permintaan gagal.'}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const cls = kind === 'error' ? 'border-rose-800 bg-rose-950/40 text-rose-200' : 'border-emerald-800 bg-emerald-950/40 text-emerald-200';
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Field({ label, error, children, hint }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-slate-500">{hint}</span>}
      {error && <span className="block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Cover({ color = '#6366f1', size = 'h-16 w-16', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`${size} ${className} flex shrink-0 items-center justify-center rounded-lg text-2xl text-white/90 shadow-inner`}
      style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }}
    >
      ♪
    </div>
  );
}
