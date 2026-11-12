import PDFDocument from 'pdfkit';
import { parseDate } from '../validate.js';
import { badRequest } from '../errors.js';
import * as reportRepo from '../repositories/report.repository.js';

const TZ = 'Asia/Jakarta';
const fmtDate = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' }).format(new Date(d));
const fmtRp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export function parseRange(query) {
  const from = parseDate(query.from, 'Tanggal awal');
  const to = parseDate(query.to, 'Tanggal akhir');
  if (from && to && from > to) throw badRequest('Tanggal awal tidak boleh setelah tanggal akhir.');
  return { from, to };
}

export async function salesReport(range) {
  const rows = await reportRepo.salesRows(range);
  const total = rows.reduce((sum, r) => sum + r.price, 0);
  return { range, rows, summary: { transactions: rows.length, total } };
}

export const dashboard = () => reportRepo.stats();

// Mencegah CSV/formula injection di spreadsheet: sel diawali = + - @ diberi apostrof.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export const CSV_HEADER = ['Invoice', 'Tanggal Bayar', 'Pelanggan', 'Email', 'Lagu', 'Penyanyi', 'Harga'];

export async function salesCsv(range) {
  const { rows, summary } = await salesReport(range);
  const lines = [CSV_HEADER, ...rows.map((r) => [r.invoiceNo, fmtDate(r.paidAt), r.customerName, r.customerEmail, r.songTitle, r.artistName, r.price])];
  lines.push(['TOTAL', '', '', '', '', `${summary.transactions} transaksi`, summary.total]);
  return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export async function salesPdf(range) {
  const { rows, summary } = await salesReport(range);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  doc.fontSize(16).text('MusicPedia - Laporan Penjualan Lagu');
  doc.fontSize(9).fillColor('#555').text(`Periode: ${range.from || 'awal'} s.d. ${range.to || 'sekarang'}   |   Dibuat: ${fmtDate(new Date())}`);
  doc.moveDown(0.5).fillColor('#000');
  const cols = [
    ['Invoice', 110], ['Tanggal Bayar', 110], ['Pelanggan', 120], ['Lagu', 150], ['Penyanyi', 120], ['Harga', 70],
  ];
  const row = (cells, bold = false) => {
    if (doc.y > 540) doc.addPage();
    const y = doc.y;
    let x = 36;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    cells.forEach((c, i) => {
      doc.text(String(c), x, y, { width: cols[i][1] - 6, height: 12, ellipsis: true, lineBreak: false, align: i === 5 ? 'right' : 'left' });
      x += cols[i][1];
    });
    doc.y = y + 15;
    doc.x = 36;
  };
  row(cols.map((c) => c[0]), true);
  rows.forEach((r) => row([r.invoiceNo, fmtDate(r.paidAt), r.customerName, r.songTitle, r.artistName, fmtRp(r.price)]));
  doc.moveDown(0.5);
  row(['TOTAL', '', '', '', `${summary.transactions} transaksi`, fmtRp(summary.total)], true);
  doc.end();
  return doc;
}
