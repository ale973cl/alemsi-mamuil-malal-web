import 'server-only';
import { query } from '@/lib/db/pool';

function baseUrl(){
  const explicita=String(process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||'').trim().replace(/\/$/,'');
  if(explicita) return explicita;
  const vercel=String(process.env.VERCEL_URL||'').trim().replace(/\/$/,'');
  return vercel?`https://${vercel}`:'';
}

export function folioReclamo(id:number){return `R-${String(id).padStart(6,'0')}`;}

export async function obtenerEnlaceConsultaReclamo(id:number){
  const rows=await query<{consulta_token:string}>(`SELECT consulta_token::text consulta_token FROM reclamos_sugerencias WHERE id=$1 LIMIT 1`,[id]);
  const token=String(rows[0]?.consulta_token||'').trim();
  const base=baseUrl();
  if(!token||!base) return null;
  return `${base}/reclamo/${encodeURIComponent(folioReclamo(id))}/${encodeURIComponent(token)}`;
}

export async function obtenerReclamoConsultaPublica(folio:string,token:string){
  const match=/^R-(\d{6,})$/i.exec(String(folio||'').trim());
  if(!match||!/^[0-9a-f-]{36}$/i.test(String(token||'').trim())) return null;
  const id=Number(match[1]);
  const rows=await query<any>(`SELECT r.id,r.rut,r.nombre,r.tipo,r.categoria,r.mensaje,r.fecha,r.estado,
    COALESCE(r.area_actual,'AdminCasino') area_actual,r.actualizado_por,r.fecha_actualizacion,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',m.id,'actor',m.actor,'actor_rol',m.actor_rol,'accion',m.accion,'destino_rol',m.destino_rol,'mensaje',m.mensaje,'estado',m.estado_resultante,'fecha',m.fecha) ORDER BY m.id) FROM reclamo_movimientos m WHERE m.reclamo_id=r.id),'[]'::json) movimientos
    FROM reclamos_sugerencias r WHERE r.id=$1 AND r.consulta_token=$2::uuid LIMIT 1`,[id,token]);
  return rows[0]||null;
}
