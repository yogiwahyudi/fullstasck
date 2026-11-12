import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/auth.controller.js';
import * as songs from '../controllers/song.controller.js';
import * as customers from '../controllers/customer.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as reports from '../controllers/report.controller.js';

const api = Router();

// Autentikasi
api.post('/auth/register', auth.register);
api.post('/auth/login', auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', authenticate, auth.me);

// Katalog publik (Pengunjung & Pelanggan)
api.get('/songs', songs.list);
api.get('/songs/genres', songs.genres);
api.get('/songs/:id', songs.detail);
api.get('/songs/:id/preview', songs.preview);

// File penuh: wajib login + sudah membeli
api.get('/songs/:id/stream', authenticate, songs.stream);
api.get('/songs/:id/download', authenticate, songs.download);

// Pelanggan
const customer = [authenticate, requireRole('CUSTOMER')];
api.get('/customers/:id/profile', authenticate, customers.getProfile);
api.put('/customers/:id/profile', authenticate, customers.updateProfile);
api.post('/orders', ...customer, orders.create);
api.post('/orders/:id/pay', ...customer, orders.pay);
api.get('/orders', ...customer, orders.history);
api.get('/library', ...customer, orders.library);

// Admin
const admin = Router();
admin.use(authenticate, requireRole('ADMIN'));
admin.get('/dashboard', reports.dashboard);
admin.get('/lookups', songs.lookups);
admin.get('/songs', songs.adminList);
admin.post('/songs', songs.adminCreate);
admin.get('/songs/:id', songs.adminDetail);
admin.put('/songs/:id', songs.adminUpdate);
admin.delete('/songs/:id', songs.adminRemove);
admin.get('/customers', customers.adminList);
admin.post('/customers', customers.adminCreate);
admin.get('/customers/:id', customers.adminGet);
admin.put('/customers/:id', customers.adminUpdate);
admin.delete('/customers/:id', customers.adminRemove);
admin.get('/sales', reports.sales);
admin.get('/sales/export.csv', reports.salesCsv);
admin.get('/sales/export.pdf', reports.salesPdf);
api.use('/admin', admin);

export default api;
