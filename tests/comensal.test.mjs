import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { consolidarDeudaPasada, minutaReservable } from '../lib/reglas/reserva.ts';

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

const ahoraChileMediodia=new Date('2026-08-22T16:00:00.000Z');
const linea=(overrides={})=>({referencia_reserva:'MM-1',fecha:'2026-08-22',servicio:'Almuerzo',monto_pendiente:6400,estado:'Pendiente',...overrides});

test('servicio pasado pendiente bloquea',()=>{
  const deuda=consolidarDeudaPasada([linea({servicio:'Desayuno'})],ahoraChileMediodia);
  assert.equal(deuda.length,1);
  assert.equal(deuda[0].monto_pendiente,6400);
});

test('reserva futura pendiente sola no bloquea',()=>{
  const deuda=consolidarDeudaPasada([linea({servicio:'Cena'})],ahoraChileMediodia);
  assert.deepEqual(deuda,[]);
});

test('combinación pasada y futura bloquea solamente por la pasada',()=>{
  const deuda=consolidarDeudaPasada([linea({servicio:'Desayuno'}),linea({servicio:'Cena',monto_pendiente:9000})],ahoraChileMediodia);
  assert.equal(deuda.length,1);
  assert.equal(deuda[0].monto_pendiente,6400);
});

test('sin deuda pasada continúa sin bloqueo',()=>{
  const deuda=consolidarDeudaPasada([],ahoraChileMediodia);
  assert.deepEqual(deuda,[]);
});

test('ambos motores consultan líneas y aplican el mismo criterio temporal central',async()=>{
  const [nuevo,legado]=await Promise.all([source('lib/db/reservas.ts'),source('lib/reservation.ts')]);
  for(const motor of [nuevo,legado]){
    assert.match(motor,/SELECT referencia_reserva,fecha,servicio/);
    assert.match(motor,/consolidarDeudaPasada\(lineas\)/);
    assert.doesNotMatch(motor,/GROUP BY referencia_reserva/);
  }
});

test('solo el estado PUBLICADA queda disponible para reservas',()=>{
  for(const estado of ['BORRADOR','EN_REVISION','OBSERVADA','AUTORIZADA','PUBLICABLE',null,undefined]){
    assert.equal(minutaReservable(estado),false,`${estado} no debe ser reservable`);
  }
  assert.equal(minutaReservable('PUBLICADA'),true);
});

test('ambos motores y ambas lecturas de menú exigen publicación efectiva',async()=>{
  const fuentes=await Promise.all([
    source('lib/db/minutas.ts'),
    source('lib/reservation.ts'),
    source('app/api/comensal/menu/route.ts'),
  ]);
  for(const codigo of fuentes){
    assert.match(codigo,/ESTADO_MINUTA_PUBLICADA/);
    assert.doesNotMatch(codigo,/COALESCE\(estado,'PUBLICABLE'\)='PUBLICABLE'/);
  }
});
