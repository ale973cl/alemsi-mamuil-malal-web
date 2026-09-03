import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('AdminTotal usa la operación canónica y no existe sub-namespace /admin-total',()=>{
  const permisos=read('lib/reglas/permisos.ts');
  assert.match(permisos,/AdminTotal:'\/admin-casino'/);
  assert.doesNotMatch(permisos,/href:'\/admin-total'/);
  assert.equal(existsSync(new URL('../app/admin-total/page.tsx',import.meta.url)),false);
});

test('Reclamos usa ficha única con datos de contacto e historial',()=>{
  const page=read('app/reclamos-gestion/page.tsx');
  for(const label of ['RUT','Teléfono','Correo','Institución','Código de reserva','Fecha / hora','Descripción completa','Historial de gestión']) assert.match(page,new RegExp(label));
  assert.match(page,/AdminCasino.*AdminTotal.*Coordinacion.*Gerencia.*Finanzas/);
});

test('Cocina consolida por servicio, opción/plato, institución y raciones',()=>{
  const page=read('app/cocina/page.tsx');
  assert.match(page,/raciones/i);
  assert.match(page,/institucion/);
  assert.match(page,/plato/);
  assert.match(page,/tipo_opcion/);
});

test('PDF de producción conserva consolidación y formato ejecutivo',()=>{
  const pdf=read('app/api/produccion/reporte-pdf/route.ts');
  assert.match(pdf,/REPORTE DIARIO DE PRODUCCIÓN/);
  assert.match(pdf,/RACIONES A PRODUCIR|Raciones a producir/);
  assert.match(pdf,/groupDish/);
  assert.match(pdf,/institutions/);
});

test('La minuta operativa no agrega columnas de correo',()=>{
  const carga=read('components/MinutaCarga.tsx');
  const publicada=read('components/MinutaPublicada.tsx');
  assert.doesNotMatch(carga,/<th[^>]*>\s*Correo\s*<\/th>/i);
  assert.doesNotMatch(publicada,/<th[^>]*>\s*Correo\s*<\/th>/i);
  assert.match(carga,/Publicar minuta/);
});

test('Reserva persiste antes de programar la confirmación por correo',()=>{
  const action=read('app/reserva/actions.ts');
  const persist=action.indexOf('crearOActualizarReserva(input)');
  const deferred=action.indexOf('after(async () =>');
  const notifier=action.indexOf('notificarReservaConfirmadaDinamica(mensaje)');
  assert.ok(persist>=0 && deferred>persist && notifier>deferred);
  assert.match(action,/RESERVA_SMTP_START/);
  assert.match(action,/RESERVA_SMTP_OK/);
  assert.match(action,/RESERVA_SMTP_ERROR/);
});
