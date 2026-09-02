import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type InlineAttachment={filename:string;contentType:string;content:Buffer|Uint8Array;cid?:string;disposition?:'attachment'|'inline'};

function esSeptiembreEnChile(fecha=new Date()){
  const mes=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',month:'numeric'}).format(fecha);
  return Number(mes)===9;
}

async function leerPng(...partes:string[]){
  return readFile(path.join(process.cwd(),'public','email',...partes));
}

function limpiarCabecerasLegadas(html:string){
  return html
    .replace(/<tr><td style="background:#0B2D5B[^\"]*"[^>]*><div[^>]*>ALEMSI · CASINO MAMUIL<\/div><div[^>]*>SEPTIEMBRE · FIESTAS PATRIAS<\/div><\/td><\/tr>/gi,'')
    .replace(/<div style="background:#0B2D5B[^\"]*"[^>]*>ALEMSI · (?:Gestión de Reclamos|Atención al Comensal)<\/div>/gi,'')
    .replace(/<div style="font-size:14px;font-weight:800;color:#087A46;margin-bottom:18px">¡Feliz Mes de la Patria! ALEMSI te desea unas felices Fiestas Patrias\.<\/div>/gi,'');
}

function bloqueBranding(headerCid:string,logoCid:string){
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 auto 14px;max-width:680px;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><tr><td style="padding:0;text-align:center"><img src="cid:${headerCid}" alt="ALEMSI · Casino Mamuil Malal · Servicio de Alimentación" width="680" style="display:block;width:100%;max-width:680px;height:auto;border:0"/></td></tr><tr><td style="padding:10px 14px;text-align:center;background:#fff"><img src="cid:${logoCid}" alt="ALEMSI" width="205" style="display:inline-block;width:205px;max-width:48%;height:auto;border:0;vertical-align:middle"/><div style="display:inline-block;max-width:48%;margin-left:12px;vertical-align:middle;text-align:left"><div style="font-size:16px;line-height:1.2;font-weight:800;color:#0B2D5B">CASINO MAMUIL MALAL</div><div style="margin-top:3px;font-size:11px;line-height:1.2;font-weight:700;color:#0D9B91">SERVICIO DE ALIMENTACIÓN</div></div></td></tr></table>`;
}

export async function aplicarBrandingCorreo(html:string,attachments:InlineAttachment[]){
  const yaTieneCabecera=/cid:cabecera-[^\"']+/i.test(html);
  const yaTieneLogo=/cid:alemsi-logo-[^\"']+/i.test(html);
  if(yaTieneCabecera&&yaTieneLogo) return{html,attachments};
  try{
    const headerFilename=esSeptiembreEnChile()?'cabecera-septiembre.png':'cabecera-institucional.png';
    const [header,logo]=await Promise.all([
      leerPng('header',headerFilename),
      leerPng('septiembre','alemsi-logo-email.png'),
    ]);
    const nonce=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
    const headerCid=`cabecera-motor-${nonce}@alemsi.cl`;
    const logoCid=`alemsi-logo-motor-${nonce}@alemsi.cl`;
    const bloque=bloqueBranding(headerCid,logoCid);
    const limpio=limpiarCabecerasLegadas(html);
    const bodyMatch=/<body\b[^>]*>/i.exec(limpio);
    const htmlFinal=bodyMatch
      ? `${limpio.slice(0,bodyMatch.index+bodyMatch[0].length)}${bloque}${limpio.slice(bodyMatch.index+bodyMatch[0].length)}`
      : `${bloque}${limpio}`;
    return{
      html:htmlFinal,
      attachments:[
        ...attachments,
        {filename:headerFilename,contentType:'image/png',content:header,cid:headerCid,disposition:'inline' as const},
        {filename:'alemsi-logo-email.png',contentType:'image/png',content:logo,cid:logoCid,disposition:'inline' as const},
      ],
    };
  }catch{
    return{html,attachments};
  }
}
