import test from 'node:test';
import assert from 'node:assert/strict';
import { fechaAgregable, filtrarMinutaReservable } from '../lib/reglas/calendario.ts';
import type { ReglasReserva } from '../lib/reglas/reserva.ts';
const reglas:ReglasReserva={anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:2,excepciones_habilitadas:1};
const rows=[
  {fecha:'2026-08-21',dia_semana:'Viernes',servicio:'Almuerzo',tipo_opcion:'OPCIÓN 1',plato:'A'},
  {fecha:'2026-08-23',dia_semana:'Domingo',servicio:'Cena',tipo_opcion:'HIPOCALÓRICO',plato:'B'},
];
test('calendario comercial solo devuelve servicios que superan el corte',()=>{const result=filtrarMinutaReservable(rows,'Visitas',reglas,new Date('2026-08-20T17:00:00Z'));assert.deepEqual(result.map(x=>x.fecha),['2026-08-23']);});
test('reglas institucionales aceptan opciones históricas acentuadas',()=>{assert.equal(filtrarMinutaReservable(rows,'ALEMSI Paso Fronterizo',reglas).length,2);assert.deepEqual(filtrarMinutaReservable(rows,'ALEMSI Administrativos',reglas).map(x=>x.servicio),['Almuerzo']);});
test('selección deshabilita fechas que exceden máximo consecutivo',()=>{assert.equal(fechaAgregable(['2026-08-20','2026-08-21'],'2026-08-22',2),false);assert.equal(fechaAgregable(['2026-08-20','2026-08-21'],'2026-08-23',2),true);});
