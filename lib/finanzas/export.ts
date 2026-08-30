import 'server-only';
import { listarFinanzas } from '@/lib/db/finanzas';
import { fechaIsoChile } from '@/lib/fecha-hora';
import { calcularKpisFinancieros,coincideEstadoFinanciero,coincidePeriodoFinanciero,normalizarPeriodoFinanciero,pagadoValidado,pendienteConComprobante,pendienteSinComprobante,rechazado,serviciosFinancieros,sinComprobante } from '@/lib/reglas/finanzas';

export type FinanceFilters={desde?:string;hasta?:string;institucion?:string;medio?:string;q?:string;estado?:string};
function mesActual(){const [y,m]=fechaIsoChile().split('-');const ultimo=new Date(Date.UTC(Number(y),Number(m),0)).getUTCDate();return{desde:`${y}-${m}-01`,hasta:`${y}-${m}-${String(ultimo).padStart(2,'0')}`}}
export function financeStatus(r:any){if(sinComprobante(r)&&pagadoValidado(r))return 'Pagado · sin comprobante';if(pendienteSinComprobante(r))return 'Sin comprobante';if(pendienteConComprobante(r))return 'Comprobante por validar';if(rechazado(r))return 'Rechazado';return pagadoValidado(r)?'Validado':'Pendiente';}

export async function financeExportData(f:FinanceFilters){
  const rows=await listarFinanzas();
  const q=String(f.q||'').trim().toLocaleLowerCase('es-CL');
  const periodo=normalizarPeriodoFinanciero(String(f.desde||''),String(f.hasta||''),mesActual());
  const base=rows.filter((r:any)=>{
    if(f.institucion&&String(r.institucion||'')!==f.institucion)return false;
    if(f.medio&&String(r.metodo_pago||'')!==f.medio)return false;
    if(q&&!([r.rut,r.nombre,r.codigo_reserva,r.institucion,r.metodo_pago].map(v=>String(v||'').toLocaleLowerCase('es-CL')).join(' ').includes(q)))return false;
    return true;
  });
  const filtered=base.filter((r:any)=>coincidePeriodoFinanciero(r,periodo)&&coincideEstadoFinanciero(r,f.estado||'global'));
  const detail=filtered.flatMap((r:any)=>serviciosFinancieros(r).filter(s=>String(s.fecha||'')>=periodo.desde&&String(s.fecha||'')<=periodo.hasta).map((s:any)=>({codigo_reserva:r.codigo_reserva||'',rut:r.rut||'',comensal:r.nombre||'',institucion:r.institucion||'',tipo_cliente:r.tipo_cliente||r.tipo_comensal||'',fecha:s.fecha||'',servicio:s.servicio||'',plato:s.plato||'',opcion:s.opcion||'',valor_servicio:Number(s.monto||0),monto_reserva:Number(r.total||0),medio_pago:r.metodo_pago||'',estado_financiero:r.estado_pago||'Pendiente',estado_comprobante:r.comprobante_estado||'Sin comprobante',estado_visible:financeStatus(r),motivo:r.comprobante_motivo||r.motivo_estado_pago||''})));
  const kpi=calcularKpisFinancieros(base,periodo);
  return{filters:{...f,...periodo},rows:filtered,detail,totalReservas:filtered.length,total:kpi.reservadoPeriodo,pagado:kpi.pagadoPeriodo,pendiente:kpi.pendientePeriodo};
}
