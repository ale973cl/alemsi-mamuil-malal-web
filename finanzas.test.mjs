import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resumenFinanzas } from '../lib/reglas/finanzas.ts';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Finanzas ofrece Validar, Observar y Rechazar con motivos obligatorios donde corresponde',async()=>{
  const [page,action,db]=await Promise.all([source('app/finanzas/page.tsx'),source('app/finanzas/actions.ts'),source('lib/db/finanzas.ts')]);
  assert.match(page,/>Validar</);
  assert.match(page,/>Observar</);
  assert.match(page,/>Rechazar</);
  assert.equal((page.match(/name="motivo" required/g)||[]).length,2);
  assert.match(action,/estado!=='Pagado'&&!motivo\.trim\(\)/);
  assert.match(db,/estado!=='Pagado'&&!motivoLimpio/);
  assert.match(db,/estado==='Observado'\?'OBSERVADO':'RECHAZADO'/);
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

test('un comprobante observado o rechazado admite nueva carga sin borrar el anterior',async()=>{
  const comprobantes=await source('lib/db/comprobantes.ts');
  assert.match(comprobantes,/\['OBSERVADO','RECHAZADO'\]\.includes/);
  assert.match(comprobantes,/INSERT INTO comprobantes_pago/);
  assert.match(comprobantes,/'RECIBIDO','POSTGRESQL_FALLBACK'/);
  assert.match(comprobantes,/WHERE pago_token=\$2/);
  assert.match(comprobantes,/input\.referencia, input\.token, input\.rut/);
  assert.doesNotMatch(comprobantes,/DELETE FROM comprobantes_pago/);
  assert.match(comprobantes,/pg_advisory_xact_lock/);
});

test('los KPI clasifican y suman los estados operativos vigentes',()=>{
  const resumen=resumenFinanzas([
    {estado_pago:'Pendiente',total:100},
    {estado_pago:'Comprobante recibido',comprobante_id:1,comprobante_estado:'RECIBIDO',total:200},
    {estado_pago:'Observado',comprobante_id:2,comprobante_estado:'OBSERVADO',total:300},
    {estado_pago:'Rechazado',comprobante_id:3,comprobante_estado:'RECHAZADO',total:400},
    {estado_pago:'Pagado',comprobante_id:4,comprobante_estado:'VALIDADO',total:500},
  ]);
  assert.deepEqual(resumen,{pendientes:1,comprobantes:1,observados:1,rechazados:1,validados:1,monto_pendiente:1000,monto_validado:500});
});

test('la bandeja ofrece estados, vista global, institución y detalle completo',async()=>{
  const page=await source('app/finanzas/page.tsx');
  for(const label of ['Todos','Sin comprobante','Por validar','Observados','Rechazados','Validados']) assert.match(page,new RegExp(label));
  assert.match(page,/name="institucion"/);
  assert.match(page,/<details/);
  assert.match(page,/Método de pago/);
  assert.match(page,/Motivo reciente/);
  assert.match(page,/Servicios reservados/);
  assert.match(page,/servicio\.plato/);
  assert.match(page,/Historial de comprobantes/);
  const db=await source('lib/db/finanzas.ts');
  assert.match(db,/JSON_AGG\(JSON_BUILD_OBJECT/);
  assert.match(db,/comprobantes_historial/);
});

test('las acciones financieras mantienen autorización de servidor y auditoría central',async()=>{
  const [action,db]=await Promise.all([source('app/finanzas/actions.ts'),source('lib/db/finanzas.ts')]);
  assert.match(action,/requireUser\(\['Finanzas','AdminTotal'\]\)/);
  for(const rol of ['Coordinacion','Gerencia','Cocina','AdminCasino']) assert.doesNotMatch(action,new RegExp(`requireUser\\([^)]*${rol}`));
  assert.match(db,/PAGO_VALIDADO/);
  assert.match(db,/PAGO_OBSERVADO/);
  assert.match(db,/PAGO_RECHAZADO/);
  assert.match(db,/registrarAuditoriaTx/);
  assert.doesNotMatch(db,/INSERT INTO auditoria_acciones/);
});
