import 'server-only';
import { query } from '@/lib/db/pool';
import { enviarCorreoSmtp } from '@/lib/email/smtp';

export type DestinoReclamo={
  area_key:string;
  area_nombre:string;
  rol:string;
  responsable:string;
  correo:string;
};

function esc(v:unknown){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
}

export async function obtenerDestinoReclamo(areaKey:string):Promise<DestinoReclamo>{
  const rows=await query<DestinoReclamo>(
    `SELECT area_key,area_nombre,rol,responsable,correo
       FROM reclamo_areas_responsables
      WHERE area_key=$1 AND activo=TRUE
      LIMIT 1`,
    [areaKey],
  );
  const destino=rows[0];
  if(!destino) throw new Error('El área seleccionada no está activa para recibir reclamos.');
  if(!String(destino.correo||'').trim()) throw new Error(`El área ${destino.area_nombre} no tiene un correo configurado.`);
  return destino;
}

export async function notificarDerivacionReclamo(input:{
  destino:DestinoReclamo;
  reclamoId:number;
  actor:string;
  mensaje:string;
  estado?:string;
}){
  const folio=`R-${String(input.reclamoId).padStart(6,'0')}`;
  const asunto=`ALEMSI · Reclamo derivado · ${folio} · ${input.destino.area_nombre}`;
  const text=[
    `Se ha derivado el reclamo ${folio} a ${input.destino.area_nombre}.`,
    input.destino.responsable?`Responsable: ${input.destino.responsable}`:'',
    `Derivado por: ${input.actor}`,
    input.estado?`Estado: ${input.estado}`:'',
    `Gestión / instrucción: ${input.mensaje}`,
    'Ingrese al portal ALEMSI para revisar el expediente y su trazabilidad.',
  ].filter(Boolean).join('\n');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;padding:24px;color:#14232d"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><div style="background:#0B2D5B;color:#fff;padding:18px 22px;font-weight:800">ALEMSI · Gestión de Reclamos</div><div style="padding:22px"><h2 style="margin:0 0 16px;color:#0B2D5B">${esc(folio)} derivado a ${esc(input.destino.area_nombre)}</h2>${input.destino.responsable?`<p><b>Responsable:</b> ${esc(input.destino.responsable)}</p>`:''}<p><b>Derivado por:</b> ${esc(input.actor)}</p>${input.estado?`<p><b>Estado:</b> ${esc(input.estado)}</p>`:''}<div style="margin-top:16px;padding:14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><b>Gestión / instrucción</b><br>${esc(input.mensaje)}</div><p style="margin-top:18px;font-size:13px;color:#5b6670">El correo se obtuvo automáticamente desde el maestro de responsables. No requiere ingreso manual del destinatario.</p></div></div></body></html>`;
  return enviarCorreoSmtp({to:input.destino.correo,subject:asunto,text,html});
}
