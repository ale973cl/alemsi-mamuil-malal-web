import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { epochHoraChile,fechaHoraVisibleChile,fechaVisible } from '../lib/fecha-hora.ts';
import { anticipacionParaInstitucion,diasCorridosDelPeriodo,fechaDentroVentanaMaxima,reservaComercialHabilitada,reservaInstitucionHabilitada } from '../lib/reglas/reserva.ts';

test('presentación usa DD-MM-AAAA y hora Chile',()=>{
  assert.equal(fechaVisible('2026-08-30'),'30-08-2026');
  assert.equal(fechaHoraVisibleChile(new Date('2026-08-30T05:25:30Z')),'30-08-2026 · 01:25:30');
});

test('conversión Chile respeta DST sin offsets fijos',()=>{
  assert.equal(new Date(epochHoraChile('2026-08-30',0)).toISOString(),'2026-08-30T04:00:00.000Z');
  assert.equal(new Date(epochHoraChile('2026-12-30',0)).toISOString(),'2026-12-30T03:00:00.000Z');
});

test('cierre día completo rechaza 23:59 y acepta antes del cierre',()=>{
  assert.equal(reservaComercialHabilitada('2026-08-30','Almuerzo',24,new Date('2026-08-30T03:59:00Z')),true);
  assert.equal(reservaComercialHabilitada('2026-08-30','Almuerzo',24,new Date('2026-08-30T04:00:00Z')),false);
  assert.equal(reservaComercialHabilitada('2026-08-30','Almuerzo',24,new Date('2026-08-30T04:01:00Z')),false);
});

test('horas exactas aplican 12h, 6h y 3h sin cambiar código',()=>{
  const servicio='2026-08-30T17:00:00Z'; // Almuerzo 13:00 Chile
  for(const horas of [12,6,3]){
    const limite=new Date(new Date(servicio).getTime()-horas*3_600_000);
    assert.equal(reservaComercialHabilitada('2026-08-30','Almuerzo',horas,new Date(limite.getTime()-1),'America/Santiago','HORAS_EXACTAS'),true);
    assert.equal(reservaComercialHabilitada('2026-08-30','Almuerzo',horas,limite,'America/Santiago','HORAS_EXACTAS'),false);
  }
});

test('modalidad día completo cierra a las 00:00 Chile del mismo día',()=>{
  const reglas={anticipacion_reserva_horas:12,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1,modalidad_cierre:'DIA_COMPLETO',anticipacion_otros_horas:12};
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-05T03:59:59.999Z')),true);
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-05T04:00:00.000Z')),false);
});

test('modalidad horas exactas respeta servicio e institución',()=>{
  const reglas={anticipacion_reserva_horas:12,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1,modalidad_cierre:'HORAS_EXACTAS',anticipacion_otros_horas:12};
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-05T11:59:59.999Z'),'America/Santiago','Cena'),true);
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-05T12:00:00.000Z'),'America/Santiago','Cena'),false);
});

test('cierre fijo del día anterior permite 14:59 y bloquea desde 15:00 Chile',()=>{
  const reglas={anticipacion_reserva_horas:12,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1,modalidad_cierre:'CORTE_DIA_ANTERIOR',anticipacion_otros_horas:12,hora_corte_dia_anterior:15};
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-04T18:59:59.999Z'),'America/Santiago','Almuerzo'),true);
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-04T19:00:00.000Z'),'America/Santiago','Almuerzo'),false);
  assert.equal(reservaInstitucionHabilitada('2026-09-05','Visitas',reglas,new Date('2026-09-04T19:00:00.000Z'),'America/Santiago','Cena'),false);
});

test('Oficina y otros leen valores independientes de la misma regla',()=>{
  const reglas={anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1,anticipacion_oficina_horas:12,anticipacion_otros_horas:6};
  assert.equal(anticipacionParaInstitucion(reglas,'ALEMSI Administrativos'),12);
  assert.equal(anticipacionParaInstitucion(reglas,'Visitas'),6);
});

test('ventana máxima futura se valida en días Chile',()=>{
  const ahora=new Date('2026-08-30T12:00:00Z');
  assert.equal(fechaDentroVentanaMaxima('2026-09-05',6,ahora),true);
  assert.equal(fechaDentroVentanaMaxima('2026-09-06',6,ahora),false);
  assert.equal(fechaDentroVentanaMaxima('2026-08-29',6,ahora),false);
});

test('período de reserva cuenta siete días corridos entre viernes y jueves',()=>{
  assert.equal(diasCorridosDelPeriodo(['2026-09-04','2026-09-10']),7);
  assert.equal(diasCorridosDelPeriodo(['2026-09-04','2026-09-11']),8);
  assert.equal(diasCorridosDelPeriodo(['2026-09-04']),1);
});

test('reglas y conversión se mantienen bajo 10 ms por operación',()=>{
  const inicio=performance.now();
  for(let i=0;i<1000;i++) reservaComercialHabilitada('2026-12-30','Cena',6,new Date('2026-12-30T10:00:00Z'),'America/Santiago','HORAS_EXACTAS');
  assert.ok((performance.now()-inicio)/1000<10);
});
