export type FilaFinanzas={estado_pago?:string|null;comprobante_estado?:string|null;comprobante_id?:number|null;total?:number|null};

export function resumenFinanzas(rows:FilaFinanzas[]){
  const resumen={pendientes:0,comprobantes:0,rechazados:0,validados:0,monto_pendiente:0,monto_validado:0};
  for(const row of rows){
    const pago=String(row.estado_pago||'Pendiente').trim().toLowerCase();
    const comprobante=String(row.comprobante_estado||'').trim().toUpperCase();
    const monto=Number(row.total||0);
    if(pago==='pagado'||comprobante==='VALIDADO'){
      resumen.validados+=1;
      resumen.monto_validado+=monto;
    }else{
      resumen.monto_pendiente+=monto;
      if(pago==='rechazado'||comprobante==='RECHAZADO') resumen.rechazados+=1;
      else if(row.comprobante_id||pago==='comprobante recibido') resumen.comprobantes+=1;
      else resumen.pendientes+=1;
    }
  }
  return resumen;
}
