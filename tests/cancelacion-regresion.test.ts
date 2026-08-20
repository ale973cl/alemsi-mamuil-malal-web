import test from 'node:test';
import assert from 'node:assert/strict';
import { firmarCancelacion, validarCancelacionDirecta, verificarCancelacion } from '../lib/reglas/acceso-comensal.ts';
test('capacidad liga RUT, fila y referencia',()=>{const token=firmarCancelacion('secret','12345678-5',7,'MM-1');assert.equal(verificarCancelacion(token,firmarCancelacion('secret','12345678-5',7,'MM-1')),true);assert.equal(verificarCancelacion(token,firmarCancelacion('secret','12345678-5',8,'MM-1')),false);});
test('cancelación aplica ventana y conserva idempotencia del estado',()=>{assert.equal(validarCancelacionDirecta('ACTIVA','2026-08-22','Almuerzo',24,new Date('2026-08-20T17:00:00Z')),'CANCELABLE');assert.equal(validarCancelacionDirecta('CANCELADA','2026-08-22','Almuerzo',24),'YA_CANCELADA');assert.throws(()=>validarCancelacionDirecta('ACTIVA','2026-08-21','Almuerzo',24,new Date('2026-08-20T17:00:00.001Z')),/fuera de la ventana/);});
