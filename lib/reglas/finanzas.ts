export type ServicioFinanciero={fecha?:string|null;monto?:number|null};
export type FilaFinanzas={estado_pago?:string|null;comprobante_estado?:string|null;comprobante_id?:number|null;total?:number|null;servicios?:ServicioFinanciero[]|null};
export type EstadoBandeja='sin-comprobante'|'por-validar'|'observados'|'rechazados'|'validados';
export type FiltroEstado='global'|'pendientes'|'sin-comprobante'|'por-validar'|'rechazados'|'validados';
export type PeriodoFinanciero={desde:string;hasta:string};

const pago=(row:FilaFinanzas)=>String(row.estado_pago||'Pendiente').trim().toUpperCase();
const comprobante=(row:FilaFinanzas)=>String(row.comprobante_estado||'').trim().toUpperCase();
export const serviciosFinancieros=(row:FilaFinanzas)=>Array.isArray(row.servicios)?row.servicios:[];
export const pagadoValidado=(row:FilaFinanzas)=>['PAGADO','APROBADO'].includes(pago(row))||comprobante(row)==='VALIDADO';
export const cobrable=(row:FilaFinanzas)=>!['NO APLICA','COSTO ASUMIDO','COSTO ASUMIDO / NO COBRABLE'].includes(pago(row))&&Number(row.total||0)>0;
export const sinComprobante=(row:FilaFinanzas)=>!row.comprobante_id;
export const comprobantePorValidar=(row:FilaFinanzas)=>Boolean(row.comprobante_id)&&!['VALIDADO','RECHAZADO','OBSERVADO'].includes(comprobante(row));
export const rechazado=(row:FilaFinanzas)=>pago(row)==='RECHAZADO'||comprobante(row)==='RECHAZADO';
export const pendienteSinComprobante=(row:FilaFinanzas)=>cobrable(row)&&!pagadoValidado(row)&&sinComprobante(row);
export const pendienteConComprobante=(row:FilaFinanzas)=>cobrable(row)&&!pagadoValidado(row)&&comprobantePorValidar(row);
export const pendientePorRecaudar=(row:FilaFinanzas)=>pendienteSinComprobante(row)||pendienteConComprobante(row);

export function estadoBandeja(row:FilaFinanzas):EstadoBandeja{
  if(pagadoValidado(row)) return 'validados';
  if(pago(row)==='OBSERVADO'||comprobante(row)==='OBSERVADO') return 'observados';
  if(rechazado(row)) return 'rechazados';
  if(pendienteConComprobante(row)) return 'por-validar';
  return 'sin-comprobante';
}

export function coincideEstadoFinanciero(row:FilaFinanzas,estado:string):boolean{
  if(estado==='global') return true;
  if(estado==='pendientes') return pendientePorRecaudar(row);
  if(estado==='sin-comprobante') return pendienteSinComprobante(row);
  if(estado==='por-validar') return pendienteConComprobante(row);
  if(estado==='rechazados') return rechazado(row);
  if(estado==='validados') return pagadoValidado(row);
  return true;
}

export function normalizarPeriodoFinanciero(desde:string,hasta:string,fallback:PeriodoFinanciero):PeriodoFinanciero{
  if(desde&&hasta) return desde<=hasta?{desde,hasta}:{desde:hasta,hasta:desde};
  if(desde) return {desde,hasta:desde};
  if(hasta) return {desde:hasta,hasta};
  return fallback;
}

const fechaEnPeriodo=(fecha:string,periodo:PeriodoFinanciero)=>fecha>=periodo.desde&&fecha<=periodo.hasta;
export const coincidePeriodoFinanciero=(row:FilaFinanzas,periodo:PeriodoFinanciero)=>serviciosFinancieros(row).some(s=>fechaEnPeriodo(String(s.fecha||''),periodo));
const montoPeriodo=(row:FilaFinanzas,periodo:PeriodoFinanciero)=>serviciosFinancieros(row).reduce((sum,s)=>sum+(fechaEnPeriodo(String(s.fecha||''),periodo)?Number(s.monto||0):0),0);
const montoAnterior=(row:FilaFinanzas,periodo:PeriodoFinanciero)=>serviciosFinancieros(row).reduce((sum,s)=>sum+(String(s.fecha||'')<periodo.desde?Number(s.monto||0):0),0);

export function calcularKpisFinancieros(rows:FilaFinanzas[],periodo:PeriodoFinanciero){
  const reservadoPeriodo=rows.reduce((sum,row)=>sum+montoPeriodo(row,periodo),0);
  const pagadoPeriodo=rows.filter(pagadoValidado).reduce((sum,row)=>sum+montoPeriodo(row,periodo),0);
  const pendientePeriodo=rows.filter(pendientePorRecaudar).reduce((sum,row)=>sum+montoPeriodo(row,periodo),0);
  const porValidarPeriodo=rows.filter(pendienteConComprobante).reduce((sum,row)=>sum+montoPeriodo(row,periodo),0);
  const deudaAnterior=rows.filter(pendientePorRecaudar).reduce((sum,row)=>sum+montoAnterior(row,periodo),0);
  return {reservadoPeriodo,pagadoPeriodo,pendientePeriodo,porValidarPeriodo,deudaAnterior,saldoTotal:pendientePeriodo+deudaAnterior};
}

export function resumenFinanzas(rows:FilaFinanzas[]){
  const resumen={pendientes:0,comprobantes:0,observados:0,rechazados:0,validados:0,monto_pendiente:0,monto_validado:0};
  for(const row of rows){const monto=Number(row.total||0);const estado=estadoBandeja(row);if(estado==='validados'){resumen.validados++;resumen.monto_validado+=monto;}else{resumen.monto_pendiente+=monto;if(estado==='rechazados')resumen.rechazados++;else if(estado==='observados')resumen.observados++;else if(estado==='por-validar')resumen.comprobantes++;else resumen.pendientes++;}}
  return resumen;
}
