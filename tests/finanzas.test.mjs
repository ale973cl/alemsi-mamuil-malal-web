import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resumenFinanzas } from '../lib/reglas/finanzas.ts';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Finanzas ofrece únicamente Validar y Rechazar y exige motivo de rechazo',async()=>{
  const [page,action,db]=await Promise.all([source('app/finanzas/page.tsx'),source('app/finanzas/actions.ts'),source('lib/db/finanzas.ts')]);
  assert.doesNotMatch(`${page}\n${action}\n${db}`,/Observad|OBSERVADO/);
  assert.match(page,/>Validar</);
  assert.match(page,/>Rechazar</);
  assert.match(page,/name="motivo" required/);
  assert.match(action,/estado==='Rechazado'&&!motivo\.trim\(\)/);
  assert.match(db,/estado==='Rechazado'&&!motivoLimpio/);
});

test('validación y rechazo auditan solo columnas reales y conservan comprobantes anteriores',async()=>{
  const db=await source('lib/db/finanzas.ts');
  assert.match(db,/registrarAuditoriaTx/);
  assert.doesNotMatch(db,/INSERT INTO auditoria_acciones/);
  assert.match(db,/SELECT id,estado FROM comprobantes_pago WHERE referencia_reserva=\$1 ORDER BY id DESC LIMIT 1 FOR UPDATE/);
  assert.match(db,/WHERE id=\$5/);
  assert.match(db,/!==\s*'RECIBIDO'/);
  assert.doesNotMatch(db,/DELETE FROM comprobantes_pago/);
});

test('la vista muestra Ver comprobante o Sin comprobante y usa el último archivo',async()=>{
  const [page,db]=await Promise.all([source('app/finanzas/page.tsx'),source('lib/db/finanzas.ts')]);
  assert.match(page,/>Ver comprobante</);
  assert.match(page,/>Sin comprobante</);
  assert.match(db,/LEFT JOIN LATERAL/);
  assert.match(db,/ORDER BY id DESC/);
});

test('un comprobante rechazado admite una nueva carga sin borrar el anterior',async()=>{
  const comprobantes=await source('lib/db/comprobantes.ts');
  assert.match(comprobantes,/!== 'RECHAZADO'/);
  assert.match(comprobantes,/INSERT INTO comprobantes_pago/);
  assert.doesNotMatch(comprobantes,/DELETE FROM comprobantes_pago/);
  assert.match(comprobantes,/pg_advisory_xact_lock/);
});

test('los KPI clasifican y suman los estados operativos vigentes',()=>{
  const resumen=resumenFinanzas([
    {estado_pago:'Pendiente',total:100},
    {estado_pago:'Comprobante recibido',comprobante_id:1,comprobante_estado:'RECIBIDO',total:200},
    {estado_pago:'Rechazado',comprobante_id:2,comprobante_estado:'RECHAZADO',total:300},
    {estado_pago:'Pagado',comprobante_id:3,comprobante_estado:'VALIDADO',total:400},
  ]);
  assert.deepEqual(resumen,{pendientes:1,comprobantes:1,rechazados:1,validados:1,monto_pendiente:600,monto_validado:400});
});

test('la bandeja ofrece estados, vista global, institución y detalle completo',async()=>{
  const page=await source('app/finanzas/page.tsx');
  for(const label of ['Global','Sin comprobante','Por validar','Rechazados','Validados']) assert.match(page,new RegExp(label));
  assert.match(page,/name="institucion"/);
  assert.match(page,/<details/);
  assert.match(page,/Método de pago/);
  assert.match(page,/Motivo \/ historial reciente/);
  assert.match(page,/Servicios reservados/);
  assert.match(page,/servicio\.plato/);
  const db=await source('lib/db/finanzas.ts');
  assert.match(db,/JSON_AGG\(JSON_BUILD_OBJECT/);
});
