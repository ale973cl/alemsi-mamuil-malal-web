import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Reserva envía después de persistir y mantiene el enlace del pago_token', () => {
  const action=read('app/reserva/actions.ts');
  assert.ok(action.indexOf('crearOActualizarReserva(input)') < action.lastIndexOf('notificarReservaConfirmada'));
  const api=read('app/api/comensal/confirm/route.ts');
  assert.ok(api.lastIndexOf('saveReservation') < api.lastIndexOf('notificarReservaConfirmada'));
  const mail=read('lib/email/notificaciones.ts');
  assert.match(mail,/\/comprobante\/\$\{encodeURIComponent\(token\)\}/);
});

test('POST de comprobante persiste antes de notificar y no cambia referencia/token', () => {
  const route=read('app/api/comprobante/[token]/route.ts');
  assert.ok(route.indexOf('guardarComprobanteEnPostgres') < route.indexOf('notificarComprobanteRecibido'));
  assert.match(route,/referencia: reserva\.referencia_reserva/);
  assert.match(route,/pagoToken: token/);
  const db=read('lib/db/comprobantes.ts');
  assert.doesNotMatch(db,/DELETE\s+FROM\s+comprobantes_pago/i);
});

test('SMTP usa STARTTLS y devuelve errores seguros sin exponer EMAIL_PASS', () => {
  const smtp=read('lib/email/smtp.ts');
  assert.match(smtp,/command\(socket,'STARTTLS'\)/);
  assert.match(smtp,/MAIL FROM/);
  assert.match(smtp,/RCPT TO/);
  assert.match(smtp,/errorType/);
  assert.doesNotMatch(read('lib/email/notificaciones.ts'),/EMAIL_PASS/);
});
