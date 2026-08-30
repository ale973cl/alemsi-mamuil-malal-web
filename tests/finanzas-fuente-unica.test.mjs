import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularKpisFinancieros,coincideEstadoFinanciero,coincidePeriodoFinanciero,normalizarPeriodoFinanciero,pendienteConComprobante } from '../lib/reglas/finanzas.ts';

const multimes={estado_pago:'Pendiente',total:300,servicios:[{fecha:'2026-08-31',monto:100},{fecha:'2026-09-01',monto:200}]};
const porValidar={estado_pago:'Pendiente',comprobante_id:1,comprobante_estado:'RECIBIDO',total:400,servicios:[{fecha:'2026-09-02',monto:400}]};
const pagada={estado_pago:'Pagado',comprobante_id:2,comprobante_estado:'VALIDADO',total:500,servicios:[{fecha:'2026-09-03',monto:500}]};

test('imputa cada servicio a su mes sin duplicar deuda anterior',()=>{
  const agosto=calcularKpisFinancieros([multimes],{desde:'2026-08-01',hasta:'2026-08-31'});
  assert.equal(agosto.pendientePeriodo,100);
  assert.equal(agosto.deudaAnterior,0);
  const septiembre=calcularKpisFinancieros([multimes],{desde:'2026-09-01',hasta:'2026-09-30'});
  assert.equal(septiembre.pendientePeriodo,200);
  assert.equal(septiembre.deudaAnterior,100);
  assert.equal(septiembre.saldoTotal,300);
});

test('contador, filtro y KPI por validar comparten el mismo predicado',()=>{
  const rows=[multimes,porValidar,pagada];
  const periodo={desde:'2026-09-01',hasta:'2026-09-30'};
  const universo=rows.filter(r=>coincidePeriodoFinanciero(r,periodo));
  assert.equal(universo.filter(pendienteConComprobante).length,1);
  assert.deepEqual(universo.filter(r=>coincideEstadoFinanciero(r,'por-validar')),[porValidar]);
  assert.equal(calcularKpisFinancieros(rows,periodo).porValidarPeriodo,400);
});

test('un extremo de fecha representa ese único día en bandeja y KPI',()=>{
  assert.deepEqual(normalizarPeriodoFinanciero('2026-09-02','',{desde:'2026-09-01',hasta:'2026-09-30'}),{desde:'2026-09-02',hasta:'2026-09-02'});
  assert.deepEqual(normalizarPeriodoFinanciero('','2026-09-02',{desde:'2026-09-01',hasta:'2026-09-30'}),{desde:'2026-09-02',hasta:'2026-09-02'});
});
