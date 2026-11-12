import { useState } from 'react';
import { api, dateTime } from '../../api.js';
import { useAsync, useDebounced } from '../../hooks.js';
import { Alert, EmptyState, ErrorBox, Field, Loading, PageHeader } from '../../components/ui.jsx';

const EMPTY = { fullName: '', email: '', password: '', phone: '', address: '', isActive: true };

export default function AdminCustomers() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, loading, error, reload } = useAsync(() => api.adminCustomers({ q: dq }), [dq]);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const remove = async (c) => {
    if (!window.confirm(`Hapus pelanggan ${c.email}? Histori penjualannya tetap tersimpan.`)) return;
    setActionError(''); setNotice('');
    try { await api.adminDeleteCustomer(c.id); setNotice('Pelanggan dihapus.'); reload(); } catch (e) { setActionError(e.message); }
  };

  return (
    <>
      <PageHeader title="Kelola Pelanggan" actions={<button className="btn btn-primary" onClick={() => { setNotice(''); setEditing('new'); }}>+ Tambah pelanggan</button>} />
      <input className="input mb-4 max-w-sm" type="search" placeholder="Cari nama atau email…" aria-label="Cari pelanggan" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-4 space-y-2"><Alert kind="success">{notice}</Alert><Alert>{actionError}</Alert></div>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && !data.customers.length && <EmptyState title="Belum ada pelanggan">{dq ? 'Tidak ada pelanggan yang cocok.' : 'Pelanggan akan muncul setelah registrasi.'}</EmptyState>}
      {data?.customers.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Nama</th><th className="th">Email</th><th className="th">Telepon</th><th className="th">Status</th><th className="th">Terdaftar</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {data.customers.map((c) => (
                <tr key={c.id}>
                  <td className="td font-medium">{c.fullName}</td>
                  <td className="td">{c.email}</td>
                  <td className="td">{c.phone || '-'}</td>
                  <td className="td">{c.isActive ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="td">{dateTime(c.createdAt)}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn btn-ghost !py-1" onClick={() => setEditing(c)}>Ubah</button>{' '}
                    <button className="btn btn-danger !py-1" onClick={() => remove(c)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <CustomerForm
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => { setEditing(null); setNotice(m); reload(); }}
        />
      )}
    </>
  );
}

function CustomerForm({ customer, onClose, onSaved }) {
  const [f, setF] = useState(customer ? { ...EMPTY, ...customer, password: '' } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const d = err?.details || {};
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.adminSaveCustomer(customer?.id, f);
      onSaved(customer ? 'Pelanggan diperbarui.' : 'Pelanggan ditambahkan.');
    } catch (x) { setErr(x); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={customer ? 'Ubah pelanggan' : 'Tambah pelanggan'}>
      <form onSubmit={submit} noValidate className="card my-8 w-full max-w-lg space-y-4 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">{customer ? 'Ubah pelanggan' : 'Tambah pelanggan'}</h2>
        <Alert>{err && !Object.keys(d).length ? err.message : err && 'Periksa kembali isian formulir.'}</Alert>
        <Field label="Nama lengkap" error={d.fullName}><input className="input" value={f.fullName} onChange={set('fullName')} /></Field>
        <Field label="Email" error={d.email}><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Kata sandi" error={d.password} hint={customer ? 'Kosongkan jika tidak diubah.' : 'Minimal 8 karakter.'}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
        <Field label="Telepon" error={d.phone}><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Alamat" error={d.address}><input className="input" value={f.address} onChange={set('address')} /></Field>
        {customer && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Akun aktif</label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}
