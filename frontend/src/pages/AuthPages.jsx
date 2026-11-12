import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert, Field } from '../components/ui.jsx';

function useSubmit(action, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await action());
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

const homeFor = (user) => (user.role === 'ADMIN' ? '/admin' : '/dashboard');

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const from = location.state?.from;
  const { busy, error, submit } = useSubmit(() => login(f), (u) => navigate(u.role === 'ADMIN' ? '/admin' : from || homeFor(u), { replace: true }));
  if (user) return <Navigate to={homeFor(user)} replace />;
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6" noValidate>
      <h1 className="text-2xl font-bold">Masuk</h1>
      {from && <Alert kind="info">Silakan masuk untuk melanjutkan.</Alert>}
      <Alert>{error?.message}</Alert>
      <Field label="Email" error={error?.details?.email}>
        <input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      </Field>
      <Field label="Kata sandi" error={error?.details?.password}>
        <input className="input" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      </Field>
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
      <p className="text-center text-sm text-slate-400">Belum punya akun? <Link to="/register" className="text-brand-400 hover:underline">Daftar</Link></p>
    </form>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', password: '', phone: '', address: '' });
  const { busy, error, submit } = useSubmit(() => register(f), () => navigate('/dashboard', { replace: true }));
  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const d = error?.details || {};
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6" noValidate>
      <h1 className="text-2xl font-bold">Daftar Akun Pelanggan</h1>
      <Alert>{error && !Object.keys(d).length ? error.message : error && 'Periksa kembali isian formulir.'}</Alert>
      <Field label="Nama lengkap" error={d.fullName}><input className="input" value={f.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
      <Field label="Email" error={d.email}><input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
      <Field label="Kata sandi" error={d.password} hint="Minimal 8 karakter."><input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
      <Field label="Telepon (opsional)" error={d.phone}><input className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
      <Field label="Alamat (opsional)" error={d.address}><input className="input" value={f.address} onChange={set('address')} autoComplete="street-address" /></Field>
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Memproses…' : 'Daftar'}</button>
      <p className="text-center text-sm text-slate-400">Sudah punya akun? <Link to="/login" className="text-brand-400 hover:underline">Masuk</Link></p>
    </form>
  );
}
