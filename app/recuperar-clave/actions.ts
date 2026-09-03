'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearTokenRecuperacion, restablecerPassword } from '@/lib/db/auth';
import { enviarCorreoSmtp } from '@/lib/email/smtp';

function originFromHeaders(h:Headers){const host=h.get('x-forwarded-host')||h.get('host');const proto=h.get('x-forwarded-proto')||'https';if(!host)throw new Error('No fue posible determinar el sitio.');return`${proto}://${host}`;}
function esc(v:string){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}

export async function solicitarRecuperacionAction(formData:FormData){
 const identificador=String(formData.get('identificador')||'').trim();if(identificador){const reset=await crearTokenRecuperacion(identificador);if(reset){const origin=originFromHeaders(await headers());const link=`${origin}/restablecer-clave?token=${encodeURIComponent(reset.token)}`;await enviarCorreoSmtp({to:reset.correo,subject:'Recuperar contraseña · ALEMSI',text:`Recibimos una solicitud para recuperar tu contraseña. El enlace vence en 30 minutos y solo puede usarse una vez:\n${link}\n\nSi no hiciste esta solicitud, ignora este correo.`,html:`<div style="font-family:Arial,sans-serif;color:#203747"><h2 style="color:#0B2D5B">Recuperar contraseña</h2><p>Recibimos una solicitud para recuperar tu acceso al sistema ALEMSI.</p><p><a href="${esc(link)}" style="display:inline-block;background:#0D9B91;color:white;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Crear nueva contraseña</a></p><p style="font-size:13px;color:#6B7570">El enlace vence en 30 minutos y solo puede utilizarse una vez. Si no hiciste esta solicitud, ignora este correo.</p>`});}}
 redirect('/recuperar-clave?enviado=1');
}

export async function restablecerPasswordAction(formData:FormData){
 const token=String(formData.get('token')||'');const password=String(formData.get('password')||'');const confirmacion=String(formData.get('confirmacion')||'');
 if(password.length<10)redirect(`/restablecer-clave?token=${encodeURIComponent(token)}&error=largo`);if(password!==confirmacion)redirect(`/restablecer-clave?token=${encodeURIComponent(token)}&error=coincidencia`);
 const ok=await restablecerPassword(token,password);if(!ok)redirect('/restablecer-clave?error=token');redirect('/login?clave=actualizada');
}
