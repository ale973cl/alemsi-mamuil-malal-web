import 'server-only';
import { query } from '@/lib/db/pool';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { normalizarCategoriaReclamo } from '@/lib/db/reclamos';
import { obtenerEnlaceConsultaReclamo } from '@/lib/reclamos-consulta';

export type DestinoReclamo={area_key:string;area_nombre:string;rol:string;responsable:string;correo:string};
function esc(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function asuntoBase(reclamoId:number){return `ALEMSI · Reclamo · R-${String(reclamoId).padStart(6,'0')}`;}
function hiloInterno(reclamoId:number){return `alemsi-reclamo-${reclamoId}-interno`;}
function hiloComensal(reclamoId:number){return `alemsi-reclamo-${reclamoId}-comensal`;}

export async function obtenerDestinoReclamo(areaKey:string):Promise<DestinoReclamo>{
  const rows=await query<DestinoReclamo>(`SELECT area_key,area_nombre,rol,responsable,correo FROM reclamo_areas_responsables WHERE area_key=$1 AND activo=TRUE LIMIT 1`,[areaKey]);
  const destino=rows[0];
  if(!destino) throw new Error('El área seleccionada no está activa para recibir reclamos.');
  // La asignación funcional no depende del correo. Si falta, el expediente se deriva
  // igualmente y la notificación SMTP se omite hasta que Gerencia configure el dato.
  return destino;
}

export async function obtenerDestinoReclamoActual(areaORol:string):Promise<DestinoReclamo|null>{
  const valor=String(areaORol||'').trim();if(!valor)return null;
  const rows=await query<DestinoReclamo>(`SELECT area_key,area_nombre,rol,responsable,correo FROM reclamo_areas_responsables WHERE (area_key=$1 OR rol=$1) AND activo=TRUE ORDER BY CASE WHEN area_key=$1 THEN 0 ELSE 1 END LIMIT 1`,[valor]);
  return rows[0]||null;
}

export async function obtenerRuteoReclamo(categoria:string){
  const categoriaKey=normalizarCategoriaReclamo(categoria);
  const principalRows=await query<DestinoReclamo>(`SELECT a.area_key,a.area_nombre,a.rol,a.responsable,a.correo FROM reclamo_categorias_config c JOIN reclamo_areas_responsables a ON a.area_key=c.area_principal WHERE c.categoria_key=$1 AND a.activo=TRUE LIMIT 1`,[categoriaKey]);
  const copias=await query<DestinoReclamo>(`SELECT a.area_key,a.area_nombre,a.rol,a.responsable,a.correo FROM reclamo_permisos p JOIN reclamo_areas_responsables a ON a.area_key=p.area_key WHERE p.categoria_key=$1 AND COALESCE(p.recibe_copia,FALSE)=TRUE AND a.activo=TRUE ORDER BY a.orden,a.area_nombre`,[categoriaKey]);
  return {categoriaKey,principal:principalRows[0]||null,copias};
}

async function enviarUnicos(destinos:DestinoReclamo[],input:{subject:string;text:string;html?:string;threadKey?:string;reply?:boolean}){
  const vistos=new Set<string>();let enviados=0;
  for(const destino of destinos){const to=String(destino.correo||'').trim().toLowerCase();if(!to||vistos.has(to))continue;vistos.add(to);const result=await enviarCorreoSmtp({to,subject:input.subject,text:input.text,html:input.html,thread:input.threadKey?{key:input.threadKey,reply:input.reply}:undefined});if(result.ok)enviados+=1;else console.error('RECLAMO_INTERNAL_SMTP_ERROR',{to,errorType:result.errorType});}
  return enviados;
}

export async function notificarIngresoReclamoInterno(input:{id:number;tipo:string;categoria:string;nombre:string;rut:string;mensaje:string;fecha:string}){
  const ruteo=await obtenerRuteoReclamo(input.categoria);const coordinacionRows=await query<DestinoReclamo>(`SELECT area_key,area_nombre,rol,responsable,correo FROM reclamo_areas_responsables WHERE area_key='COORDINACION' AND activo=TRUE LIMIT 1`);const coordinacion=coordinacionRows[0]||null;const destinos=[...(ruteo.principal?[ruteo.principal]:[]),...ruteo.copias,...(coordinacion?[coordinacion]:[])];
  if(!destinos.some(d=>String(d.correo||'').trim()))return {enviados:0,ruteo};const folio=`R-${String(input.id).padStart(6,'0')}`;const enlace=await obtenerEnlaceConsultaReclamo(input.id);const text=[`Nuevo caso ${folio}`,`Tipo: ${input.tipo}`,`Categoría: ${input.categoria}`,`Comensal: ${input.nombre}`,`RUT: ${input.rut}`,`Mensaje: ${input.mensaje}`,enlace?`Consulta segura del expediente: ${enlace}`:'','El enlace permite consultar únicamente este reclamo, en modo solo lectura, sin ingresar al portal ALEMSI.'].filter(Boolean).join('\n\n');const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;padding:24px;color:#14232d"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><div style="background:#0B2D5B;color:#fff;padding:18px 22px;font-weight:800">ALEMSI · Gestión de Reclamos</div><div style="padding:22px"><h2 style="margin:0 0 16px;color:#0B2D5B">Nuevo ${esc(input.tipo)} · ${esc(folio)}</h2><p><b>Categoría:</b> ${esc(input.categoria)}</p><p><b>Comensal:</b> ${esc(input.nombre)} · ${esc(input.rut)}</p><div style="margin-top:16px;padding:14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><b>Mensaje</b><br>${esc(input.mensaje)}</div>${enlace?`<p style="margin-top:18px"><a href="${esc(enlace)}" style="display:inline-block;background:#0D9B91;color:#fff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:800">Ver expediente del reclamo</a></p>`:''}</div></div></body></html>`;return {enviados:await enviarUnicos(destinos,{subject:asuntoBase(input.id),text,html,threadKey:hiloInterno(input.id),reply:false}),ruteo};
}

export async function notificarDerivacionReclamo(input:{destino:DestinoReclamo;copias?:DestinoReclamo[];reclamoId:number;actor:string;mensaje:string;estado?:string}){
  const folio=`R-${String(input.reclamoId).padStart(6,'0')}`;const text=[`Se ha derivado el reclamo ${folio} a ${input.destino.area_nombre}.`,input.destino.responsable?`Responsable: ${input.destino.responsable}`:'',`Derivado por: ${input.actor}`,input.estado?`Estado: ${input.estado}`:'',`Gestión / instrucción: ${input.mensaje}`,'Ingrese al portal ALEMSI para revisar el expediente y su trazabilidad.'].filter(Boolean).join('\n');return enviarUnicos([input.destino,...(input.copias||[])],{subject:asuntoBase(input.reclamoId),text,threadKey:hiloInterno(input.reclamoId),reply:true});
}

export async function notificarActualizacionReclamo(input:{destino:DestinoReclamo|null;copias?:DestinoReclamo[];reclamoId:number;actor:string;accion:string;mensaje:string;estado?:string}){
  const destinos=[...(input.destino?[input.destino]:[]),...(input.copias||[])];if(!destinos.some(d=>String(d.correo||'').trim()))return 0;const folio=`R-${String(input.reclamoId).padStart(6,'0')}`;const text=[`El reclamo ${folio} tiene una nueva actualización.`,`Acción: ${String(input.accion||'ACTUALIZAR').replaceAll('_',' ')}`,`Registrado por: ${input.actor}`,input.estado?`Estado: ${input.estado}`:'',input.mensaje?`Comentario / gestión: ${input.mensaje}`:''].filter(Boolean).join('\n\n');return enviarUnicos(destinos,{subject:asuntoBase(input.reclamoId),text,threadKey:hiloInterno(input.reclamoId),reply:true});
}

export async function notificarResolucionReclamoComensal(input:{reclamoId:number;rut:string;nombre:string;categoria:string;mensaje:string;estado:string}){
  const rows=await query<{correo:string}>(`SELECT correo FROM comensales WHERE rut=$1 LIMIT 1`,[input.rut]);const correo=String(rows[0]?.correo||'').trim().toLowerCase();if(!correo)return {ok:false as const,motivo:'sin_correo_comensal'};const folio=`R-${String(input.reclamoId).padStart(6,'0')}`;const cerrado=String(input.estado).toLocaleLowerCase('es-CL')==='cerrado';const text=[`Hola ${input.nombre},`,`Tu caso ${folio} ha sido ${cerrado?'finalizado':'resuelto'}.`,`Categoría: ${input.categoria}`,`Estado: ${input.estado}`,input.mensaje?`Respuesta / solución: ${input.mensaje}`:'','Conserva este correo y el folio como respaldo.'].filter(Boolean).join('\n\n');const result=await enviarCorreoSmtp({to:correo,subject:asuntoBase(input.reclamoId),text,thread:{key:hiloComensal(input.reclamoId),reply:true}});return result.ok?{ok:true as const}:{ok:false as const,motivo:result.errorType};
}
