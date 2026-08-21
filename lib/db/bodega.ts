import 'server-only';
import { query } from '@/lib/db/pool';

export async function dashboardBodega(){
  const [resumen,inventario]=await Promise.all([
    query<any>(`SELECT COUNT(*) lotes,COUNT(*) FILTER (WHERE COALESCE(stock,0)>0) lotes_con_stock,COALESCE(SUM(stock),0) stock_total,COUNT(*) FILTER (WHERE COALESCE(stock,0)<=0) sin_stock FROM bodega_inventario`),
    query<any>(`SELECT id,nombre_articulo,stock,caduca FROM bodega_inventario ORDER BY nombre_articulo,caduca ASC NULLS LAST,id LIMIT 300`),
  ]);
  return {resumen:resumen[0]||{},inventario};
}
