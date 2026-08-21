import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('RUT inválido se rechaza y RUT válido inexistente inicia alta',async()=>{
  const actions=await source('app/reserva/actions.ts');
  assert.match(actions,/if \(!validarRutM11\(rutInput\)\) return \{ ok: false as const, error: 'RUT inválido\.'/);
  assert.match(actions,/nuevo: true as const/);
  assert.match(actions,/listarInstitucionesActivas\(\)/);
});

test('el alta valida contacto e institución y continúa con la identificación normal',async()=>{
  const actions=await source('app/reserva/actions.ts');
  assert.match(actions,/correoValido/);
  assert.match(actions,/telefonoValido/);
  assert.match(actions,/instituciones\.includes/);
  assert.match(actions,/await crearComensal\(input\)/);
  assert.match(actions,/await identificarComensal\(input\.rut\)/);
});

test('el alta evita duplicados sin sobrescribir una ficha existente',async()=>{
  const db=await source('lib/db/comensales.ts');
  assert.match(db,/ON CONFLICT \(rut\) DO NOTHING/);
  assert.doesNotMatch(db,/ON CONFLICT \(rut\) DO UPDATE/);
  assert.match(db,/const existente=await obtenerComensal\(rut\)/);
});

test('el wizard registra y avanza directamente al mismo circuito de minuta',async()=>{
  const wizard=await source('components/ReservaWizard.tsx');
  assert.match(wizard,/type Etapa = 'rut' \| 'registro'/);
  assert.match(wizard,/registrarNuevoComensal/);
  assert.match(wizard,/await continuarConPerfil\(response\)/);
  assert.match(wizard,/Registrar y continuar/);
});

test('el alta no modifica reglas, deuda, referencias ni tokens de reserva',async()=>{
  const db=await source('lib/db/comensales.ts');
  assert.doesNotMatch(db,/(solicitudes|referencia_reserva|pago_token|configuracion_reservas)/);
});
