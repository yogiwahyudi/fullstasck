import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const link = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3" aria-label="Navigasi utama">
          <Link to="/" className="mr-4 flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">♪</span> MusicPedia
          </Link>
          <NavLink to="/" end className={link}>Katalog</NavLink>
          {user?.role === 'CUSTOMER' && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/admin" end className={link}>Dashboard Admin</NavLink>
              <NavLink to="/admin/songs" className={link}>Lagu</NavLink>
              <NavLink to="/admin/customers" className={link}>Pelanggan</NavLink>
              <NavLink to="/admin/sales" className={link}>Laporan</NavLink>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-slate-400 sm:inline">{user.fullName || user.email}</span>
                <button className="btn btn-ghost" onClick={onLogout}>Keluar</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Masuk</Link>
                <Link to="/register" className="btn btn-primary">Daftar</Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        MusicPedia · data demo sintetis · pembayaran simulasi
      </footer>
    </div>
  );
}
