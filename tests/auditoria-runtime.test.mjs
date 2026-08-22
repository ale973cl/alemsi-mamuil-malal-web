import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('la auditoría central usa exclusivamente las columnas reales confirmadas',async()=>{
  const audit=await source('lib/db/auditoria.ts');
  assert.match(audit,/INSERT INTO auditoria_acciones \(fecha,usuario,accion\)/);
  assert.doesNotMatch(audit,/(tabla|registro_id|valor_anterior|valor_nuevo|detalle)/);
});

test('un error de auditoría no aborta una transacción funcional',async()=>{
  const audit=await source('lib/db/auditoria.ts');
  assert.match(audit,/SAVEPOINT alemsi_auditoria/);
  assert.match(audit,/ROLLBACK TO SAVEPOINT alemsi_auditoria/);
  assert.match(audit,/RELEASE SAVEPOINT alemsi_auditoria/);
  assert.match(audit,/return false/);
});

test('ningún módulo mantiene INSERT directos con columnas inexistentes',async()=>{
  const files=(await readdir(new URL('../lib/db/',import.meta.url))).filter((name)=>name.endsWith('.ts'));
  for(const file of files){
    const code=await source(`lib/db/${file}`);
    const inserts=[...code.matchAll(/INSERT INTO auditoria_acciones \(([^)]+)\)/g)];
    for(const insert of inserts) assert.equal(insert[1],'fecha,usuario,accion',`${file} conserva columnas de auditoría incompatibles`);
  }
});

test('/gerencia consulta solo la trazabilidad disponible',async()=>{
  const [db,page]=await Promise.all([source('lib/db/gerencia.ts'),source('app/gerencia/page.tsx')]);
  assert.match(db,/SELECT fecha,usuario,accion FROM auditoria_acciones/);
  assert.doesNotMatch(page,/r\.(tabla|detalle)/);
});

test('/login audita éxito y fallo mediante el escritor central',async()=>{
  const [db,action]=await Promise.all([source('lib/db/auth.ts'),source('app/actions/auth.ts')]);
  assert.match(db,/registrarAuditoria/);
  assert.match(db,/LOGIN_EXITOSO/);
  assert.match(db,/LOGIN_FALLIDO/);
  assert.match(action,/registrarLogin\(u,Boolean\(user\)\)/);
});
