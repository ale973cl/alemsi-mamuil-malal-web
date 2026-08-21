import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('/gerencia consulta y presenta solo la trazabilidad disponible', async () => {
  const [db, page] = await Promise.all([source('lib/db/gerencia.ts'), source('app/gerencia/page.tsx')]);
  assert.match(db, /SELECT fecha,usuario,accion FROM auditoria_acciones/);
  assert.doesNotMatch(db, /accion,tabla|tabla,detalle/);
  assert.doesNotMatch(page, /r\.(tabla|detalle)/);
});

test('/login audita tanto el resultado exitoso como el fallido sin columnas inexistentes', async () => {
  const [db, action] = await Promise.all([source('lib/db/auth.ts'), source('app/actions/auth.ts')]);
  assert.match(db, /INSERT INTO auditoria_acciones \(fecha,usuario,accion\)/);
  assert.doesNotMatch(db, /auditoria_acciones \([^)]*(tabla|detalle)/);
  assert.match(db, /LOGIN_EXITOSO/);
  assert.match(db, /LOGIN_FALLIDO/);
  assert.match(action, /registrarLogin\(u,Boolean\(user\)\)/);
  assert.ok(action.indexOf('registrarLogin(u,Boolean(user))') < action.indexOf("if(!user) redirect('/login?error=1')"));
});
