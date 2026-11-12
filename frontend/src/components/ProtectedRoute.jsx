import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Loading } from './ui.jsx';

/** Menjaga rute: wajib login, dan opsional peran tertentu. */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Memeriksa sesi…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) {
    return (
      <div role="alert" className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-slate-400">Halaman ini hanya untuk peran {role}.</p>
      </div>
    );
  }
  return <Outlet />;
}
