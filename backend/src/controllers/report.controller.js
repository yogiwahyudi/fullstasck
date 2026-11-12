import * as reportService from '../services/report.service.js';

export const dashboard = async (req, res) => res.json({ stats: await reportService.dashboard() });

export const sales = async (req, res) => res.json(await reportService.salesReport(reportService.parseRange(req.query)));

export async function salesCsv(req, res) {
  const csv = await reportService.salesCsv(reportService.parseRange(req.query));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-penjualan.csv"');
  res.send(csv);
}

export async function salesPdf(req, res) {
  const doc = await reportService.salesPdf(reportService.parseRange(req.query));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-penjualan.pdf"');
  doc.pipe(res);
}
