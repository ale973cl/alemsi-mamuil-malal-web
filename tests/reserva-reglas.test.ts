import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelacionDirectaHabilitada, distribuirPrecioDia, fechaActualIso,
  maxConsecutivosFechas, normalizarRutDb, reservaComercialHabilitada,
  tipoInstitucion, validarEleccionesPorDia, validarRutM11,
} from '../lib/reglas/reserva.ts';

test('RUT: valida módulo 11 y normaliza PostgreSQL',()=>{assert.equal(validarRutM11('12.345.678-5'),true);assert.equal(validarRutM11('12.345.678-4'),false);assert.equal(normalizarRutDb('12.345.678-5'),'12345678-5');});
test('fecha chilena es independiente de UTC del proceso',()=>{assert.equal(fechaActualIso(new Date('2026-08-20T02:30:00Z')),'2026-08-19');});
test('cortes usan hora Chile y frontera inclusiva',()=>{const edge=new Date('2026-08-20T17:00:00Z');assert.equal(reservaComercialHabilitada('2026-08-22','Almuerzo',48,edge),true);assert.equal(reservaComercialHabilitada('2026-08-22','Almuerzo',48,new Date(edge.getTime()+1)),false);assert.equal(cancelacionDirectaHabilitada('2026-08-21','Almuerzo',24,edge),true);});
test('máximo consecutivo ignora duplicados y separa brechas',()=>{assert.equal(maxConsecutivosFechas(['2026-08-20','2026-08-21','2026-08-21','2026-08-23']),2);});
test('precio distribuido conserva total',()=>{assert.deepEqual(distribuirPrecioDia(6400,3),[2134,2133,2133]);});
test('instituciones y selección diaria preservan reglas',()=>{assert.equal(tipoInstitucion('ALEMSI Administrativos'),'administrativos');assert.throws(()=>validarEleccionesPorDia(['2026-08-20'],[],'ALEMSI'),/al menos una ración/);});
