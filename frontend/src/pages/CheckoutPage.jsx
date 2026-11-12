import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rupiah } from '../api.js';
import { useAsync } from '../hooks.js';
import { Alert, Cover, ErrorBox, Loading } from '../components/ui.jsx';

/** Pembayaran simulasi: pesanan dibuat (PENDING), lalu dikonfirmasi. Konfirmasi ulang aman (idempoten). */
export default function CheckoutPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const song = useAsync(() => api.song(songId), [songId]);
  const [order, setOrder] = useState(null);
  const [orderError, setOrderError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState(null);

  useEffect(() => {
    let alive = true;
    api.createOrder(Number(songId)).then(
      (r) => alive && setOrder(r.order),
      (e) => alive && setOrderError(e),
    );
    return () => { alive = false; };
  }, [songId]);

  const pay = async (outcome) => {
    setBusy(true);
    setPayError(null);
    try {
      const r = await api.payOrder(order.id, { paymentRef: order.paymentRef, outcome });
      setOrder(r.sale);
      if (r.sale.status === 'PAID') setTimeout(() => navigate('/dashboard?tab=library'), 1200);
    } catch (e) {
      setPayError(e);
    } finally {
      setBusy(false);
    }
  };

  if (song.loading) return <Loading />;
  if (song.error) return <ErrorBox error={song.error} onRetry={song.reload} />;
  const s = song.data.song;

  if (orderError?.status === 409) {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
        <h1 className="text-xl font-bold">Anda sudah memiliki lagu ini</h1>
        <Link to="/dashboard?tab=library" className="btn btn-primary">Buka pustaka</Link>
      </div>
    );
  }
  if (orderError) return <ErrorBox error={orderError} />;
  if (!order) return <Loading label="Menyiapkan pesanan…" />;

  return (
    <div className="card mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-2xl font-bold">Pembayaran (Simulasi)</h1>
      <div className="flex items-center gap-4">
        <Cover color={s.coverColor} />
        <div>
          <p className="font-semibold">{s.title}</p>
          <p className="text-sm text-slate-400">{s.artist}</p>
        </div>
        <p className="ml-auto text-lg font-bold text-emerald-400">{rupiah(order.total)}</p>
      </div>
      <p className="text-xs text-slate-500">Invoice {order.invoiceNo} · status <b data-testid="order-status">{order.status}</b></p>

      {order.status === 'PAID' && <Alert kind="success">Pembayaran berhasil. Mengalihkan ke pustaka…</Alert>}
      {order.status === 'FAILED' && <Alert>Pembayaran gagal. <Link to={`/songs/${s.id}`} className="underline">Kembali ke lagu</Link> untuk mencoba lagi.</Alert>}
      <Alert>{payError?.message}</Alert>

      {order.status === 'PENDING' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary flex-1" disabled={busy} onClick={() => pay('SUCCESS')}>{busy ? 'Memproses…' : 'Bayar sekarang'}</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => pay('FAILED')}>Simulasikan gagal</button>
        </div>
      )}
      {order.status === 'PAID' && <Link to="/dashboard?tab=library" className="btn btn-primary w-full">Ke pustaka saya</Link>}
    </div>
  );
}
