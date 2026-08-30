import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('el código de peticiones no ejecuta DDL',()=>{
  const runtime=['lib/db/admin.ts','lib/db/coordinacion.ts','lib/db/publicacion-directa-minuta.ts','lib/db/solicitudes-extraordinarias.ts'];
  for(const file of runtime) assert.doesNotMatch(read(file),/CREATE TABLE|ALTER TABLE|CREATE INDEX/,file);
});

test('Admin Casino difiere consultas según la pestaña activa',()=>{
  const page=read('app/admin-casino/page.tsx');
  assert.match(page,/tab==='reglas'\?getReglas\(\)/);
  assert.match(page,/tab==='minuta'\?platosDisponibles\(\)/);
  assert.match(page,/tab==='solicitudes'\?listarSolicitudesExtraordinarias/);
});

test('reclamos lista páginas pequeñas sin cargar binarios',()=>{
  const db=read('lib/db/reclamos.ts');
  const listado=db.slice(db.indexOf('export async function listarReclamosParaRol'),db.indexOf('export async function obtenerDetalleReclamo'));
  assert.match(listado,/tamano=25/);
  assert.match(listado,/LIMIT \$/);
  assert.doesNotMatch(listado,/contenido/);
});

test('la migración idempotente prepara reclamos y encuestas',()=>{
  const migration=read('migrations/20260830_prepare_operational_modules.sql');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS reclamo_movimientos/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS encuestas_satisfaccion/);
  assert.doesNotMatch(migration,/\bDROP\b|\bTRUNCATE\b/);
});
