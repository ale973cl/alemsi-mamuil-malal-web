import {
  maxConsecutivosFechas,
  reservaComercialHabilitada,
  tipoInstitucion,
  type ReglasReserva,
} from './reserva.ts';

type MinutaReservable={fecha:string;servicio:string;tipo_opcion:string|null;plato:string;dia_semana?:string|null};

function opcionNormalizada(value:string|null){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();}

export function filtrarMinutaReservable<T extends MinutaReservable>(rows:T[],institucion:string,reglas:ReglasReserva,ahora=new Date()):T[]{
  const tipo=tipoInstitucion(institucion);
  return rows.filter(row=>{
    if(tipo==='administrativos'&&row.servicio!=='Almuerzo') return false;
    if(tipo==='paso'&&!['OPCION 1','HIPOCALORICO'].includes(opcionNormalizada(row.tipo_opcion))) return false;
    if(tipo==='comercial'&&!reservaComercialHabilitada(row.fecha,row.servicio,Number(reglas.anticipacion_reserva_horas),ahora)) return false;
    return true;
  });
}

export function fechaAgregable(fechas:string[],fecha:string,maximo:number){
  return maxConsecutivosFechas([...fechas,fecha])<=Number(maximo);
}
