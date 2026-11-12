import { randomUUID } from 'node:crypto';
import { badRequest, conflict, notFound } from '../errors.js';
import { withTransaction } from '../db.js';
import * as songRepo from '../repositories/song.repository.js';
import * as orderRepo from '../repositories/order.repository.js';

const publicSale = (s) => s && {
  id: s.id, invoiceNo: s.invoiceNo, total: s.total, status: s.status, paymentRef: s.paymentRef,
  createdAt: s.createdAt, paidAt: s.paidAt, songId: s.songId, songTitle: s.songTitle, artistName: s.artistName, price: s.price,
};

function newInvoiceNo() {
  const d = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `INV-${d}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** Membuat pesanan PENDING. Bila sudah punya lagunya -> 409; bila pesanan PENDING ada -> dipakai ulang. */
export async function create(user, songId) {
  const song = await songRepo.findById(songId);
  if (!song) throw notFound('Lagu tidak ditemukan.');
  return withTransaction(async (client) => {
    await orderRepo.lockUser(client, user.id);
    if (await orderRepo.ownsSong(user.id, songId, client)) throw conflict('Anda sudah membeli lagu ini.');
    const pending = await orderRepo.findPending(user.id, songId, client);
    if (pending) return publicSale(pending);
    const id = await orderRepo.createSale(client, { user, song, invoiceNo: newInvoiceNo(), paymentRef: `pay_${randomUUID()}` });
    return publicSale(await orderRepo.findById(id, client));
  });
}

/**
 * Konfirmasi pembayaran simulasi (idempoten). Mengirim konfirmasi yang sama berulang kali
 * tidak membuat penjualan baru: baris sales hanya berubah PENDING -> PAID satu kali.
 */
export async function pay(user, saleId, { paymentRef, outcome = 'SUCCESS' } = {}) {
  if (!['SUCCESS', 'FAILED'].includes(outcome)) throw badRequest('Hasil pembayaran tidak valid.');
  return withTransaction(async (client) => {
    const sale = await orderRepo.findByIdForUpdate(client, saleId);
    if (!sale || sale.userId !== user.id) throw notFound('Pesanan tidak ditemukan.');
    if (paymentRef !== sale.paymentRef) throw badRequest('Referensi pembayaran tidak cocok.');
    if (sale.status === 'PAID') return { sale: publicSale(sale), alreadyPaid: true };
    if (sale.status === 'FAILED') throw conflict('Pembayaran ini sudah gagal. Buat pesanan baru.');
    const status = outcome === 'SUCCESS' ? 'PAID' : 'FAILED';
    await orderRepo.setStatus(client, saleId, status);
    return { sale: publicSale(await orderRepo.findById(saleId, client)), alreadyPaid: false };
  });
}

export const history = async (user) => (await orderRepo.listByUser(user.id)).map(publicSale);

export async function library(user) {
  return (await orderRepo.library(user.id)).map((r) => ({
    ...songRepo.toSong(r, { withLyrics: true }),
    purchasedAt: r.purchased_at,
  }));
}
