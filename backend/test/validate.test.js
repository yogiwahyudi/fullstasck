import test from 'node:test';
import assert from 'node:assert/strict';
import { Validator, parseDate, parseId } from '../src/validate.js';
import { CSV_HEADER } from '../src/services/report.service.js';

test('Validator mengumpulkan kesalahan per field', () => {
  const v = new Validator({ email: 'bukan-email', password: 'pendek' }).email().password().string('fullName', 'Nama');
  assert.throws(() => v.done(), (e) => e.status === 400 && Boolean(e.details.email && e.details.password && e.details.fullName));
});

test('Validator menerima data valid dan menormalkan email', () => {
  const v = new Validator({ email: ' A@B.CO ', password: 'password1', fullName: 'Ani' }).email().password().string('fullName', 'Nama').done();
  assert.equal(v.email, 'a@b.co');
});

test('int menolak pecahan dan di luar rentang', () => {
  assert.throws(() => new Validator({ price: 10.5 }).int('price', 'Harga', { min: 1 }).done());
  assert.throws(() => new Validator({ price: 0 }).int('price', 'Harga', { min: 1 }).done());
  assert.equal(new Validator({ price: '9000' }).int('price', 'Harga', { min: 1 }).done().price, 9000);
});

test('parseId dan parseDate', () => {
  assert.equal(parseId('7'), 7);
  assert.throws(() => parseId('abc'));
  assert.throws(() => parseId('-1'));
  assert.equal(parseDate(undefined, 'x'), undefined);
  assert.equal(parseDate('2026-10-01', 'x'), '2026-10-01');
  assert.throws(() => parseDate('01/10/2026', 'x'));
});

test('header CSV laporan tetap', () => {
  assert.equal(CSV_HEADER.length, 7);
});
