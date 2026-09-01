import 'server-only';
import { query } from '@/lib/db/pool';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { obtenerEnlaceConsultaReclamo } from '@/lib/reclamos-consulta';

function esc(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function folio(id:number){return `R-${String(id).padStart(6,'0')}`;}

export async function notificarCierreReclamoCoordinacion(input:{reclamoId:number;estado:string;mensaje?:string}){
  const destinos=await query<{correo:string;responsable:string}>(`SELECT correo,responsable FROM reclamo_areas_responsables WHERE area_key='COORDINACION' AND activo=TRUE LIMIT 1`);
  const correo=String(destinos[0]?.correo||'').trim().toLowerCase();
  if(!correo) return {ok:false as const,motivo:'sin_correo_coordinacion'};

  const casoRows=await query<{categoria:string;nombre:string;rut:string}>(`SELECT categoria,nombre,rut FROM reclamos_sugerencias WHERE id=$1 LIMIT 1`,[input.reclamoId]);
  const caso=casoRows[0];
  if(!caso) return {ok:false as const,motivo:'reclamo_no_encontrado'};

  const movimientos=await query<{accion:string;actor:string;actor_rol:string;mensaje:string|null;estado_resultante:string|null;fecha:string}>(`SELECT accion,actor,actor_rol,mensaje,estado_resultante,fecha::text FROM reclamo_movimientos WHERE reclamo_id=$1 ORDER BY id`,[input.reclamoId]);
  const enlace=await obtenerEnlaceConsultaReclamo(input.reclamoId);
  const idFolio=folio(input.reclamoId);
  const trazas=movimientos.map((m,i)=>`${i+1}. ${m.fecha} · ${m.accion} · ${m.actor}${m.estado_resultante?` · ${m.estado_resultante}`:''}${m.mensaje?` · ${m.mensaje}`:''}`);
  const text=[
    `Reclamo ${idFolio} finalizado`,
    `Comensal: ${caso.nombre} · ${caso.rut}`,
    `Categoría: ${caso.categoria}`,
    `Estado final: ${input.estado}`,
    input.mensaje?`Respuesta / solución: ${input.mensaje}`:'',
    'Trazabilidad del caso:',
    ...trazas,
    enlace?`Consulta segura del expediente: ${enlace}`:'',
    'El mismo enlace recibido al inicio continúa mostrando el estado actualizado de este expediente.'
  ].filter(Boolean).join('\n\n');

  const filas=movimientos.map(m=>`<tr><td style="padding:7px 9px;border-bottom:1px solid #e2e8e5">${esc(m.fecha)}</td><td style="padding:7px 9px;border-bottom:1px solid #e2e8e5">${esc(m.accion)}</td><td style="padding:7px 9px;border-bottom:1px solid #e2e8e5">${esc(m.actor)}</td><td style="padding:7px 9px;border-bottom:1px solid #e2e8e5">${esc(m.estado_resultante||'')}</td><td style="padding:7px 9px;border-bottom:1px solid #e2e8e5">${esc(m.mensaje||'')}</td></tr>`).join('');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;padding:24px;color:#14232d"><div style="max-width:760px;margin:auto;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><div style="background:#0B2D5B;color:#fff;padding:18px 22px;font-weight:800">ALEMSI · Gestión de Reclamos</div><div style="padding:22px"><h2 style="margin:0 0 16px;color:#0B2D5B">Reclamo resuelto · ${esc(idFolio)}</h2><p><b>Comensal:</b> ${esc(caso.nombre)} · ${esc(caso.rut)}</p><p><b>Categoría:</b> ${esc(caso.categoria)}</p><p><b>Estado final:</b> ${esc(input.estado)}</p>${input.mensaje?`<div style="margin:16px 0;padding:14px;background:#eef7f6;border:1px solid #cfe5df;border-radius:8px"><b>Respuesta / solución</b><br>${esc(input.mensaje)}</div>`:''}<h3 style="color:#0B2D5B">Trazabilidad</h3><table role="presentation" width="100%" style="border-collapse:collapse;font-size:12px"><tr style="background:#eef7f6;font-weight:800"><td style="padding:7px 9px">Fecha</td><td style="padding:7px 9px">Acción</td><td style="padding:7px 9px">Responsable</td><td style="padding:7px 9px">Estado</td><td style="padding:7px 9px">Gestión</td></tr>${filas}</table>${enlace?`<p style="margin-top:20px"><a href="${esc(enlace)}" style="display:inline-block;background:#0D9B91;color:#fff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:800">Ver expediente actualizado</a></p>`:''}<p style="margin-top:18px;font-size:13px;color:#5b6670">El mismo enlace seguro enviado al ingreso del reclamo permanece vigente y muestra únicamente este expediente actualizado.</p></div></div></body></html>`;

  const result=await enviarCorreoSmtp({to:correo,subject:`ALEMSI · Reclamo · ${idFolio}`,text,html,thread:{key:`alemsi-reclamo-${input.reclamoId}-interno`,reply:true}});
  if(!result.ok) return {ok:false as const,motivo:result.errorType};
  return {ok:true as const};
}
