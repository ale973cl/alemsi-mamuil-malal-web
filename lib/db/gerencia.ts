import 'server-only';
import { query } from '@/lib/db/pool';

export async function dashboardGerencia(){
  const [reservas,pagos,produccion,auditoria,jornadas,bodega,minutas]=await Promise.all([
    query<any>(`SELECT COUNT(DISTINCT referencia_reserva) reservas,COUNT(*) raciones,SUM(COALESCE(precio_aplicado,precio,0)) monto FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha>=CURRENT_DATE::text`),
    query<any>(`SELECT COALESCE(estado_pago,'Pendiente') estado,COUNT(*) cantidad,SUM(COALESCE(precio_aplicado,precio,0)) monto FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' GROUP BY COALESCE(estado_pago,'Pendiente') ORDER BY cantidad DESC`),
    query<any>(`SELECT fecha,servicio,COUNT(*) cantidad FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha>=CURRENT_DATE::text GROUP BY fecha,servicio ORDER BY fecha,servicio LIMIT 120`),
    query<any>(`SELECT fecha,usuario,accion FROM auditoria_acciones ORDER BY id DESC LIMIT 30`),
    query<any>(`SELECT estado,COUNT(*) cantidad FROM jornadas_produccion GROUP BY estado ORDER BY estado`),
    query<any>(`SELECT COUNT(*) lotes,COUNT(*) FILTER (WHERE COALESCE(stock,0)>0) con_stock,COALESCE(SUM(stock),0) stock_total FROM bodega_inventario`),
    query<any>(`SELECT COALESCE(estado,'PUBLICABLE') estado,COUNT(*) cantidad FROM minutas WHERE COALESCE(activo,1)=1 GROUP BY COALESCE(estado,'PUBLICABLE') ORDER BY estado`),
  ]);
  return {resumen:reservas[0]||{},pagos,produccion,auditoria,jornadas,bodega:bodega[0]||{},minutas};
}
