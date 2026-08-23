import 'server-only';
import { query } from '@/lib/db/pool';

export async function dashboardGerencia(inicio:string,fin:string){
  const [reservas,pagos,produccion,auditoria,jornadas,bodega,minutas,valorizacion]=await Promise.all([
    query<any>(`SELECT COUNT(DISTINCT referencia_reserva) reservas,COUNT(*) raciones,SUM(COALESCE(precio_aplicado,precio,0)) monto FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha BETWEEN $1 AND $2`,[inicio,fin]),
    query<any>(`SELECT COALESCE(estado_pago,'Pendiente') estado,COUNT(*) cantidad,SUM(COALESCE(precio_aplicado,precio,0)) monto FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha BETWEEN $1 AND $2 GROUP BY COALESCE(estado_pago,'Pendiente') ORDER BY cantidad DESC`,[inicio,fin]),
    query<any>(`SELECT fecha,servicio,COUNT(*) cantidad FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha BETWEEN $1 AND $2 GROUP BY fecha,servicio ORDER BY fecha,servicio LIMIT 240`,[inicio,fin]),
    query<any>(`SELECT fecha,usuario,accion FROM auditoria_acciones ORDER BY id DESC LIMIT 30`),
    query<any>(`SELECT estado,COUNT(*) cantidad FROM jornadas_produccion WHERE fecha BETWEEN $1 AND $2 GROUP BY estado ORDER BY estado`,[inicio,fin]),
    query<any>(`SELECT COUNT(*) lotes,COUNT(*) FILTER (WHERE COALESCE(stock,0)>0) con_stock,COALESCE(SUM(stock),0) stock_total FROM bodega_inventario`),
    query<any>(`SELECT COALESCE(estado,'PUBLICABLE') estado,COUNT(*) cantidad FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 GROUP BY COALESCE(estado,'PUBLICABLE') ORDER BY estado`,[inicio,fin]),
    query<any>(`SELECT
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(s.estado_pago,''))='pagado' THEN COALESCE(s.precio_aplicado,s.precio,0) ELSE 0 END),0) recaudado,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(s.estado_pago,'')) IN ('pendiente','comprobante recibido','rechazado') THEN COALESCE(s.precio_aplicado,s.precio,0) ELSE 0 END),0) pendiente_recaudar,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(s.estado_pago,''))='comprobante recibido' THEN COALESCE(s.precio_aplicado,s.precio,0) ELSE 0 END),0) pendiente_validacion,
      COUNT(DISTINCT s.referencia_reserva) FILTER (WHERE LOWER(COALESCE(s.estado_pago,''))='comprobante recibido')::int pagos_por_validar,
      COUNT(DISTINCT s.referencia_reserva) FILTER (WHERE LOWER(COALESCE(s.estado_pago,''))='pagado')::int pagos_validados,
      COALESCE(SUM(CASE WHEN COALESCE(s.tipo_registro,'') IN ('CONSUMO_INTERNO','CONSUMO_COORDINADOR') OR LOWER(COALESCE(s.estado_pago,'')) IN ('costo asumido','costo asumido / no cobrable','no aplica') THEN COALESCE(NULLIF(s.precio_aplicado,0),NULLIF(s.precio,0),CASE WHEN COALESCE(i.regla_activa::int,0)=1 AND i.precio_especial IS NOT NULL THEN i.precio_especial ELSE i.precio_dia END,0) ELSE 0 END),0) costo_asumido,
      COALESCE(SUM(CASE WHEN COALESCE(s.tipo_registro,'')='CONSUMO_INTERNO' THEN COALESCE(NULLIF(s.precio_aplicado,0),NULLIF(s.precio,0),CASE WHEN COALESCE(i.regla_activa::int,0)=1 AND i.precio_especial IS NOT NULL THEN i.precio_especial ELSE i.precio_dia END,0) ELSE 0 END),0) costo_alemsi,
      COALESCE(SUM(CASE WHEN COALESCE(s.tipo_registro,'')='CONSUMO_COORDINADOR' THEN COALESCE(NULLIF(s.precio_aplicado,0),NULLIF(s.precio,0),CASE WHEN COALESCE(i.regla_activa::int,0)=1 AND i.precio_especial IS NOT NULL THEN i.precio_especial ELSE i.precio_dia END,0) ELSE 0 END),0) costo_coordinacion
      FROM solicitudes s LEFT JOIN instituciones i ON i.nombre=s.institucion
      WHERE COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA' AND s.fecha BETWEEN $1 AND $2`,[inicio,fin]),
  ]);
  return {resumen:reservas[0]||{},pagos,produccion,auditoria,jornadas,bodega:bodega[0]||{},minutas,valorizacion:valorizacion[0]||{}};
}
