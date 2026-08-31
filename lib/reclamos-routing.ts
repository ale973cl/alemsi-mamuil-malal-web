import 'server-only';
import { query } from '@/lib/db/pool';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { normalizarCategoriaReclamo } from '@/lib/db/reclamos';

export type DestinoReclamo={area_key:string;area_nombre:string;rol:string;responsable:string;correo:string};

function esc(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}

export async function obtenerDestinoReclamo(areaKey:string):Promise<DestinoReclamo>{
  const rows=await query<DestinoReclamo>(`SELECT area_key,area_nombre,rol,responsable,correo FROM reclamo_areas_responsables WHERE area_key=$1 AND activo=TRUE LIMIT 1`,[areaKey]);
  const destino=rows[0];
  if(!destino) throw new Error('El área seleccionada no está activa para recibir reclamos.');
  if(!String(destino.correo||'').trim()) throw new Error(`El área ${destino.area_nombre} no tiene un correo configurado.`);
  return destino;
}

export async function obtenerRuteoReclamo(categoria:string){
  const categoriaKey=normalizarCategoriaReclamo(categoria);
  const principalRows=await query<DestinoReclamo>(`SELECT a.area_key,a.area_nombre,a.rol,a.responsable,a.correo FROM reclamo_categorias_config c JOIN reclamo_areas_responsables a ON a.area_key=c.area_principal WHERE c.categoria_key=$1 AND a.activo=TRUE LIMIT 1`,[categoriaKey]);
  const copias=await query<DestinoReclamo>(`SELECT a.area_key,a.area_nombre,a.rol,a.responsable,a.correo FROM reclamo_permisos p JOIN reclamo_areas_responsables a ON a.area_key=p.area_key WHERE p.categoria_key=$1 AND COALESCE(p.recibe_copia,FALSE)=TRUE AND a.activo=TRUE ORDER BY a.orden,a.area_nombre`,[categoriaKey]);
  return {categoriaKey,principal:principalRows[0]||null,copias};
}

async function enviarUnicos(destinos:DestinoReclamo[],input:{subject:string;text:string;html?:string}){
  const vistos=new Set<string>(); let enviados=0;
  for(const destino of destinos){
    const to=String(destino.correo||'').trim().toLowerCase();
    if(!to||vistos.has(to)) continue;
    vistos.add(to);
    const result=await enviarCorreoSmtp({to,subject:input.subject,text:input.text,html:input.html});
    if(result.ok) enviados+=1;
    else console.error('RECLAMO_INTERNAL_SMTP_ERROR',{to,errorType:result.errorType});
  }
  return enviados;
}

export async function notificarIngresoReclamoInterno(input:{id:number;tipo:string;categoria:string;nombre:string;rut:string;mensaje:string;fecha:string}){
  const ruteo=await obtenerRuteoReclamo(input.categoria);
  const destinos=[...(ruteo.principal?[ruteo.principal]:[]),...ruteo.copias];
  if(!destinos.some(d=>String(d.correo||'').trim())) return {enviados:0,ruteo};
  const folio=`R-${String(input.id).padStart(6,'0')}`;
  const text=[`Nuevo caso ${folio}`,`Tipo: ${input.tipo}`,`Categoría: ${input.categoria}`,`Comensal: ${input.nombre}`,`RUT: ${input.rut}`,`Mensaje: ${input.mensaje}`,'Ingrese al portal ALEMSI para revisar el expediente y su trazabilidad.'].join('\n\n');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;padding:24px;color:#14232d"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><div style="background:#0B2D5B;color:#fff;padding:18px 22px;font-weight:800">ALEMSI · Gestión de Reclamos</div><div style="padding:22px"><h2 style="margin:0 0 16px;color:#0B2D5B">Nuevo ${esc(input.tipo)} · ${esc(folio)}</h2><p><b>Categoría:</b> ${esc(input.categoria)}</p><p><b>Comensal:</b> ${esc(input.nombre)} · ${esc(input.rut)}</p><div style="margin-top:16px;padding:14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><b>Mensaje</b><br>${esc(input.mensaje)}</div><p style="margin-top:18px;font-size:13px;color:#5b6670">La distribución se resolvió automáticamente desde la configuración central de Reclamos.</p></div></div></body></html>`;
  return {enviados:await enviarUnicos(destinos,{subject:`ALEMSI · Nuevo ${input.tipo} · ${folio}`,text,html}),ruteo};
}

export async function notificarDerivacionReclamo(input:{destino:DestinoReclamo;copias?:DestinoReclamo[];reclamoId:number;actor:string;mensaje:string;estado?:string}){
  const folio=`R-${String(input.reclamoId).padStart(6,'0')}`;
  const asunto=`ALEMSI · Reclamo derivado · ${folio} · ${input.destino.area_nombre}`;
  const text=[`Se ha derivado el reclamo ${folio} a ${input.destino.area_nombre}.`,input.destino.responsable?`Responsable: ${input.destino.responsable}`:'',`Derivado por: ${input.actor}`,input.estado?`Estado: ${input.estado}`:'',`Gestión / instrucción: ${input.mensaje}`,'Ingrese al portal ALEMSI para revisar el expediente y su trazabilidad.'].filter(Boolean).join('\n');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;padding:24px;color:#14232d"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><div style="background:#0B2D5B;color:#fff;padding:18px 22px;font-weight:800">ALEMSI · Gestión de Reclamos</div><div style="padding:22px"><h2 style="margin:0 0 16px;color:#0B2D5B">${esc(folio)} derivado a ${esc(input.destino.area_nombre)}</h2>${input.destino.responsable?`<p><b>Responsable:</b> ${esc(input.destino.responsable)}</p>`:''}<p><b>Derivado por:</b> ${esc(input.actor)}</p>${input.estado?`<p><b>Estado:</b> ${esc(input.estado)}</p>`:''}<div style="margin-top:16px;padding:14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><b>Gestión / instrucción</b><br>${esc(input.mensaje)}</div></div></div></body></html>`;
  return enviarUnicos([input.destino,...(input.copias||[])],{subject:asunto,text,html});
}
