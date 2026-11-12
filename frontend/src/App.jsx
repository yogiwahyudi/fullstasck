import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import SongDetailPage from './pages/SongDetailPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminSongs from './pages/admin/AdminSongs.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminSales from './pages/admin/AdminSales.jsx';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="card mx-auto max-w-md p-10 text-center">
    <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
    <Link to="/" className="btn btn-ghost mt-4">Ke katalog</Link>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="songs/:id" element={<SongDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute role="CUSTOMER" />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="checkout/:songId" element={<CheckoutPage />} />
        </Route>
        <Route path="admin" element={<ProtectedRoute role="ADMIN" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="songs" element={<AdminSongs />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="sales" element={<AdminSales />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
