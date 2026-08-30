import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('la encuesta es post-servicio, no bloqueante y no crea reclamos',async()=>{
  const [db,ui]=await Promise.all([read('lib/db/satisfaccion.ts'),read('components/EncuestaSatisfaccion.tsx')]);
  assert.match(db,/input\.fecha>=hoy/);
  assert.match(db,/evaluación del servicio es baja/);
  assert.doesNotMatch(db,/INSERT INTO reclamos_sugerencias/i);
  assert.match(ui,/no genera un reclamo automáticamente/i);
});

test('Admin Casino expone jornada, reclamos, responsables y satisfacción',async()=>{
  const page=await read('app/admin-casino/page.tsx');
  assert.match(page,/Inicio \/ cierre de jornada/);
  assert.match(page,/Responsables y correos por categoría/);
  assert.match(page,/Gestión de reclamos/);
  assert.match(page,/Satisfacción post-servicio/);
  assert.match(page,/Servicios programados/);
  assert.doesNotMatch(page,/Servicios próxima jornada/);
});

test('los reclamos de jornada son informativos y no bloquean el cierre',async()=>{
  const cocina=await read('app/cocina/page.tsx');
  assert.match(cocina,/no bloquea el cierre/);
  assert.match(cocina,/CierreJornada/);
});

test('las vistas de análisis se separan por perfil',async()=>{
  const [gerencia,coordinacion,finanzas]=await Promise.all([read('app/gerencia/page.tsx'),read('app/coordinacion/page.tsx'),read('app/finanzas/page.tsx')]);
  assert.match(gerencia,/Satisfacción servicio/);
  assert.match(coordinacion,/Seguimiento operativo/);
  assert.match(finanzas,/Reclamos de pago asignados/);
});
