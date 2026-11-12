import { Link } from 'react-router-dom';
import { api, rupiah } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { ErrorBox, Loading, PageHeader } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => api.adminDashboard(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const s = data.stats;
  const cards = [
    ['Total lagu', s.songs, '/admin/songs'],
    ['Total pelanggan', s.customers, '/admin/customers'],
    ['Penjualan lunas', s.sales, '/admin/sales'],
    ['Pendapatan', rupiah(s.revenue), '/admin/sales'],
  ];
  return (
    <>
      <PageHeader title="Dashboard Admin" subtitle="Ringkasan MusicPedia." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, to]) => (
          <Link key={label} to={to} className="card p-5 transition hover:border-brand-500">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
