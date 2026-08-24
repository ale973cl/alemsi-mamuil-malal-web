import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { minutaReservable } from '../lib/reglas/reserva.ts';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Cocina y Gerencia leen la misma fuente oficial publicada',async()=>{
  const [cocina,gerencia,minutas]=await Promise.all([source('app/cocina/page.tsx'),source('app/gerencia/page.tsx'),source('lib/db/minutas.ts')]);
  assert.match(cocina,/obtenerMinutasRango\(fecha,fecha\)/);
  assert.match(gerencia,/obtenerMinutasRango\(inicio,fin\)/);
  assert.match(minutas,/AND estado=\$3/);
  assert.match(minutas,/ESTADO_MINUTA_PUBLICADA/);
  assert.doesNotMatch(`${cocina}\n${gerencia}`,/FROM minutas/);
});

test('Cocina y Gerencia presentan la minuta exclusivamente en modo lectura',async()=>{
  const [cocina,gerencia,component]=await Promise.all([source('app/cocina/page.tsx'),source('app/gerencia/page.tsx'),source('components/MinutaPublicada.tsx')]);
  assert.match(cocina,/Minuta oficial publicada · solo lectura/);
  assert.match(gerencia,/Consulta ejecutiva · solo lectura/);
  assert.doesNotMatch(`${cocina}\n${gerencia}\n${component}`,/guardarMinuta|publicarAction|minutaAction|UPDATE minutas/);
});

test('PUBLICABLE no es oficial y PUBLICADA es compartida con Comensal',()=>{
  assert.equal(minutaReservable('PUBLICABLE'),false);
  assert.equal(minutaReservable('PUBLICADA'),true);
  assert.equal(minutaReservable(null),false);
});

test('Coordinación revisa pero no publica ni edita la minuta oficial',async()=>{
  const [page,actions,db]=await Promise.all([source('app/coordinacion/page.tsx'),source('app/coordinacion/actions.ts'),source('lib/db/coordinacion.ts')]);
  assert.match(actions,/requireUser\(\['Coordinacion','AdminTotal'\]\)/);
  assert.doesNotMatch(`${page}\n${actions}\n${db}`,/publicarMinuta|publicarAction|UPDATE minutas SET/);
});

test('la lectura operativa de Cocina no admite PUBLICABLE',async()=>{
  const db=await source('lib/db/cocina.ts');
  assert.doesNotMatch(db,/COALESCE\((?:m\.)?estado,'PUBLICABLE'\)='PUBLICABLE'/);
  assert.equal((db.match(/estado='PUBLICADA'/g)||[]).length,3);
});

test('editar una publicada la retira de todas las vistas hasta republicar',async()=>{
  const [admin,reader]=await Promise.all([source('lib/db/admin.ts'),source('lib/db/minutas.ts')]);
  assert.match(admin,/UPDATE minutas SET fecha=\$1,servicio=\$2,tipo_opcion=\$3,plato=\$4,activo=1,estado='PUBLICABLE'/);
  assert.match(admin,/REQUIERE_REVALIDACION/);
  assert.match(reader,/ESTADO_MINUTA_PUBLICADA/);
});

test('Gerencia no cuenta PUBLICABLE como minuta oficial',async()=>{
  const db=await source('lib/db/gerencia.ts');
  assert.match(db,/AND estado='PUBLICADA'/);
  assert.doesNotMatch(db,/COALESCE\(estado,'PUBLICABLE'\).*GROUP BY/);
});
