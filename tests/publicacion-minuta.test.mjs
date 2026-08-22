import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('solo AdminCasino y AdminTotal pueden solicitar publicación',async()=>{
  const actions=await source('app/admin-casino/actions.ts');
  assert.match(actions,/requireUser\(\['AdminCasino','AdminTotal'\]\)/);
  assert.match(actions,/confirmar'\)!=='PUBLICAR'/);
  for(const rol of ['Coordinacion','Gerencia','Finanzas','Cocina']) assert.doesNotMatch(actions,new RegExp(`publicarAction[^]*requireUser\\([^)]*${rol}`));
});

test('la publicación exige el último flujo AUTORIZADA dentro de la transacción',async()=>{
  const db=await source('lib/db/admin.ts');
  assert.match(db,/export async function publicarMinuta/);
  assert.match(db,/inTransaction\(async c=>/);
  assert.match(db,/ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE/);
  assert.match(db,/actual\.estado!=='AUTORIZADA'/);
  for(const estado of ['EN_REVISION','OBSERVADA','PUBLICABLE']) assert.doesNotMatch(db,new RegExp(`actual\\.estado===['"]${estado}`));
});

test('autorizar no publica y la acción explícita publica el período existente',async()=>{
  const [admin,coordinacion]=await Promise.all([source('lib/db/admin.ts'),source('lib/db/coordinacion.ts')]);
  assert.match(coordinacion,/const nuevo=obs\.length\?'OBSERVADA':'AUTORIZADA'/);
  assert.doesNotMatch(coordinacion,/SET estado='PUBLICADA'/);
  assert.match(admin,/UPDATE minutas SET estado='PUBLICADA'/);
  assert.match(admin,/UPDATE minuta_flujo_coordinacion SET estado='PUBLICADA'/);
  assert.match(admin,/registrarAuditoriaTx\(c,\{usuario:u,accion:'PUBLICAR_MINUTA'\}\)/);
});

test('editar retira publicación y Reservas sigue exigiendo PUBLICADA',async()=>{
  const [admin,minutas,legado]=await Promise.all([source('lib/db/admin.ts'),source('lib/db/minutas.ts'),source('lib/reservation.ts')]);
  assert.match(admin,/UPDATE minutas SET fecha=\$1,servicio=\$2,tipo_opcion=\$3,plato=\$4,activo=1,estado='PUBLICABLE'/);
  assert.match(minutas,/ESTADO_MINUTA_PUBLICADA/);
  assert.match(legado,/ESTADO_MINUTA_PUBLICADA/);
});

test('el circuito no agrega DDL, tablas ni copias de minuta',async()=>{
  const db=await source('lib/db/admin.ts');
  const publicar=db.slice(db.indexOf('export async function publicarMinuta'));
  assert.doesNotMatch(publicar,/CREATE TABLE|ALTER TABLE|INSERT INTO minutas/i);
});
