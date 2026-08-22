import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Mis reservas expone el mismo token y último estado del comprobante', () => {
  for (const path of ['lib/db/comensal-gestion.ts', 'app/api/comensal/reservations/route.ts']) {
    const source = read(path);
    assert.match(source, /pago_token/);
    assert.match(source, /FROM comprobantes_pago/);
    assert.match(source, /ORDER BY cp\.id DESC LIMIT 1/);
  }
  assert.match(read('app/mis-reservas/page.tsx'), /ComprobanteReservaLink/);
  assert.match(read('app/comensal/ComensalClient.tsx'), /ComprobanteReservaLink/);
});

test('la carga y recarga conserva referencia, token e historial', () => {
  const source = read('lib/db/comprobantes.ts');
  assert.match(source, /\['OBSERVADO','RECHAZADO'\]/);
  assert.match(source, /input\.referencia, input\.token, input\.rut/);
  assert.doesNotMatch(source, /DELETE\s+FROM\s+comprobantes_pago/i);
  assert.match(read('app/comprobante/[token]/page.tsx'), /ComprobanteUploader/);
});

test('la confirmación conserva acceso directo pero prioriza Mis reservas', () => {
  const source = read('components/ReservaWizard.tsx');
  assert.match(source, /Gestionar en Mis reservas/);
  assert.match(source, /Acceso directo opcional al comprobante/);
  const portal = read('app/comensal/ComensalClient.tsx');
  assert.match(portal, /profile\.debts\?\.length>0/);
  assert.match(portal, /<MyReservations rut=\{p\.rut\}/);
});
