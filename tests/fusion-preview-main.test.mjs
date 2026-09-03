import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('deuda bloqueante solo consolida servicios ya ocurridos',()=>{
  const db=read('lib/db/reservas.ts');
  assert.match(db,/consolidarDeudaPasada\(lineas\)/);
  assert.match(db,/Una reserva futura recién creada puede estar Pendiente/);
});

test('reclamos internos comparten expediente completo sin filtro por área',()=>{
  const db=read('lib/db/reclamos.ts');
  const page=read('app/reclamos-gestion/page.tsx');
  assert.doesNotMatch(db,/COALESCE\(r\.area_actual.*=\$1/);
  for(const label of ['RUT','Teléfono','Correo','Institución','Referencia del caso','Fecha / hora','Descripción completa','Adjuntos','Historial de gestión']) assert.match(page,new RegExp(label));
  assert.match(page,/casoId/);
});

test('reclamo del comensal queda visible bajo el formulario y mantiene seguimiento',()=>{
  const page=read('app/reclamos/page.tsx');
  const db=read('lib/db/reclamos.ts');
  assert.match(page,/Mis reportes recientes/);
  assert.match(page,/Solicitud registrada/);
  assert.match(page,/Solo tus casos/);
  assert.match(db,/listarReclamosComensal/);
});

test('ingreso de reclamo genera enlace directo de seguimiento para destinatarios configurados incluida Coordinación',()=>{
  const db=read('lib/db/comensal-gestion.ts');
  assert.match(db,/obtenerDestinatariosConfigurados\('Coordinacion'\)/);
  assert.match(db,/reclamos-gestion\?caso=/);
  assert.match(db,/Abrir ficha de seguimiento/);
});

test('producción usa agrupación canónica y PDF adjunto consolidado',()=>{
  const grouping=read('lib/produccion/agrupacion.ts');
  const cocina=read('app/cocina/page.tsx');
  const pdf=read('lib/email/produccion-pdf.ts');
  const action=read('app/produccion/reporte/actions.ts');
  assert.match(grouping,/servicio/); assert.match(grouping,/preparaciones/); assert.match(grouping,/instituciones/); assert.match(grouping,/personas/);
  assert.match(cocina,/Servicio → opción\/plato → institución → comensales/);
  assert.match(pdf,/agruparProduccion/);
  assert.match(action,/agruparProduccion/);
  assert.match(action,/ALEMSI-Produccion-\$\{fecha\}\.pdf/);
});

test('Gerencia ya no muestra inventario por lotes y abre reportes consolidados',()=>{
  const page=read('app/gerencia/page.tsx');
  const db=read('lib/db/gerencia.ts');
  assert.doesNotMatch(page,/Lotes con stock/);
  assert.doesNotMatch(db,/bodega_inventario/);
  assert.match(page,/Ver informe completo/);
});

test('minutas no contienen columna correo y conservan publicación directa',()=>{
  const carga=read('components/MinutaCarga.tsx');
  assert.doesNotMatch(carga,/>\s*Correo\s*</i);
  assert.match(carga,/Publicar minuta/);
  assert.match(carga,/PUBLICADOS/);
});

test('AdminTotal no usa sub-namespace independiente',()=>{
  const permisos=read('lib/reglas/permisos.ts');
  assert.equal(existsSync(new URL('../app/admin-total/page.tsx',import.meta.url)),false);
  assert.match(permisos,/AdminTotal:'\/admin-casino'/);
});

test('pie institucional incorpora crédito de desarrollo sin inventar WhatsApp',()=>{
  const layout=read('app/layout.tsx');
  assert.match(layout,/AraucaníaShop Soluciones Digitales/);
  assert.match(layout,/NEXT_PUBLIC_ARAUCANIA_SHOP_WHATSAPP_URL/);
});
