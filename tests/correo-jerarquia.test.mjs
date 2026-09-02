import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('reclamos prioriza estado, clasificación y mensaje antes del folio',()=>{
  const source=read('app/reclamos/actions.ts');
  assert.ok(source.indexOf('Estado del caso')<source.indexOf('Folio de seguimiento'));
  assert.ok(source.indexOf('Mensaje recibido')<source.indexOf('Folio de seguimiento'));
  assert.match(source,/Pendiente de revisión/);
});

test('reserva prioriza pago y detalle antes del código de respaldo',()=>{
  const source=read('lib/email/reserva-confirmacion.ts');
  assert.ok(source.indexOf('Método de pago')<source.indexOf("fila('Código de reserva'"));
  assert.ok(source.indexOf('Detalle de la reserva')<source.indexOf("fila('Código de reserva'"));
  assert.match(source,/Monto a pagar/);
});

test('avisos financieros priorizan estado, monto, motivo o acción',()=>{
  const source=read('lib/email/notificaciones.ts');
  assert.match(source,/Estado[\s\S]*Pago validado[\s\S]*Monto validado/);
  assert.match(source,/Motivo informado por Finanzas/);
  assert.match(source,/¿Qué debes hacer\?/);
});
