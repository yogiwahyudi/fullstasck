import { useState } from 'react';
import { api, dateTime, rupiah, urls } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui.jsx';

export default function AdminSales() {
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, loading, error, reload } = useAsync(() => api.adminSales(range), [range]);
  const invalid = draft.from && draft.to && draft.from > draft.to;

  return (
    <>
      <PageHeader
        title="Laporan Penjualan"
        subtitle="Hanya transaksi berstatus lunas."
        actions={
          <div className="flex gap-2">
            <a className="btn btn-ghost" href={urls.salesExport('csv', range)}>⬇ CSV</a>
            <a className="btn btn-ghost" href={urls.salesExport('pdf', range)}>⬇ PDF</a>
          </div>
        }
      />
      <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!invalid) setRange(draft); }}>
        <label className="text-sm">Dari<input className="input mt-1" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="text-sm">Sampai<input className="input mt-1" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <button className="btn btn-primary" disabled={invalid}>Terapkan</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setDraft({ from: '', to: '' }); setRange({ from: '', to: '' }); }}>Reset</button>
        {invalid && <p role="alert" className="w-full text-sm text-rose-400">Tanggal awal tidak boleh setelah tanggal akhir.</p>}
      </form>

      {loading && !data && <Loading label="Memuat laporan…" />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="card p-4"><p className="text-sm text-slate-400">Jumlah transaksi</p><p className="text-2xl font-bold" data-testid="sum-count">{data.summary.transactions}</p></div>
            <div className="card p-4"><p className="text-sm text-slate-400">Total penjualan</p><p className="text-2xl font-bold text-emerald-400" data-testid="sum-total">{rupiah(data.summary.total)}</p></div>
          </div>
          {data.rows.length === 0 ? (
            <EmptyState title="Tidak ada penjualan">Belum ada transaksi lunas pada periode ini.</EmptyState>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="th">Invoice</th><th className="th">Tanggal bayar</th><th className="th">Pelanggan</th><th className="th">Lagu</th><th className="th text-right">Harga</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {data.rows.map((r) => (
                    <tr key={`${r.id}-${r.songTitle}`}>
                      <td className="td font-mono text-xs">{r.invoiceNo}</td>
                      <td className="td">{dateTime(r.paidAt)}</td>
                      <td className="td">{r.customerName}<span className="block text-xs text-slate-500">{r.customerEmail}</span></td>
                      <td className="td">{r.songTitle}<span className="block text-xs text-slate-500">{r.artistName}</span></td>
                      <td className="td text-right">{rupiah(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
