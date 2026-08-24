export type FilaFinanzas={estado_pago?:string|null;comprobante_estado?:string|null;comprobante_id?:number|null;total?:number|null};

export type EstadoBandeja='sin-comprobante'|'por-validar'|'rechazados'|'validados';

export function estadoBandeja(row:FilaFinanzas):EstadoBandeja{
  const pago=String(row.estado_pago||'Pendiente').trim().toLowerCase();
  const comprobante=String(row.comprobante_estado||'').trim().toUpperCase();
  if(pago==='pagado'||pago==='aprobado'||comprobante==='VALIDADO') return 'validados';
  if(pago==='rechazado'||comprobante==='RECHAZADO') return 'rechazados';
  if(row.comprobante_id||pago==='comprobante recibido') return 'por-validar';
  return 'sin-comprobante';
}

export function resumenFinanzas(rows:FilaFinanzas[]){
  const resumen={pendientes:0,comprobantes:0,rechazados:0,validados:0,monto_pendiente:0,monto_validado:0};
  for(const row of rows){
    const monto=Number(row.total||0);
    const estado=estadoBandeja(row);
    if(estado==='validados'){
      resumen.validados+=1;
      resumen.monto_validado+=monto;
    }else{
      resumen.monto_pendiente+=monto;
      if(estado==='rechazados') resumen.rechazados+=1;
      else if(estado==='por-validar') resumen.comprobantes+=1;
      else resumen.pendientes+=1;
    }
  }
  return resumen;
}
