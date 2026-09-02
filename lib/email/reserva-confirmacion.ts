import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { obtenerConfiguracionBancariaActiva } from '@/lib/db/configuracion-operativa';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { horaCorteReservaParaInstitucion } from '@/lib/reglas/reserva';
import { generarReservaPdf } from '@/lib/email/reserva-pdf';
import { correoHtmlEstandar, escCorreo } from '@/lib/email/standard-layout';
import { enviarCorreoSmtp, type SmtpAttachment, type SmtpDelivery } from '@/lib/email/smtp';

type Choice={fecha:string;servicio:string;plato:string;tipo_opcion?:string};

export type ReservaConfirmacionInput={
  correo:string;
  nombre?:string;
  codigo:string;
  referencia:string;
  pagoToken?:string;
  origin:string;
  rut?:string;
  total?:number;
  method?:string;
  choices?:Choice[];
  institucion?:string;
};

function money(v:number){
  return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0));
}

function enlaceComprobante(origin:string,token:string){
  const base=new URL(origin);
  base.pathname=`/comprobante/${encodeURIComponent(token)}`;
  base.search='';
  base.hash='';
  return base.toString();
}

function fila(label:string,value:string){
  if(!String(value||'').trim()) return '';
  return `<tr><td style="padding:7px 9px;color:#5b6670;width:38%">${escCorreo(label)}</td><td style="padding:7px 9px;font-weight:700;color:#0B2D5B">${escCorreo(value)}</td></tr>`;
}

function esSeptiembreEnChile(fecha=new Date()){
  const mes=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',month:'numeric'}).format(fecha);
  return Number(mes)===9;
}

async function assetInline(carpeta:string,filename:string,cid:string):Promise<SmtpAttachment|undefined>{
  try{
    const content=await readFile(path.join(process.cwd(),'public','email',carpeta,filename));
    return{filename,contentType:'image/png',content,cid,disposition:'inline'};
  }catch{
    return undefined;
  }
}

export async function notificarReservaConfirmadaDinamica(input:ReservaConfirmacionInput):Promise<SmtpDelivery>{
  const headerFilename=esSeptiembreEnChile()?'cabecera-septiembre.png':'cabecera-institucional.png';
  const [bancaria,reglas,headerInline,logoInline,alemzinInline]=await Promise.all([
    obtenerConfiguracionBancariaActiva(),
    obtenerReglasReserva(),
    assetInline('header',headerFilename,'cabecera-reserva'),
    assetInline('septiembre','alemsi-logo-email.png','alemsi-logo-reserva'),
    assetInline('septiembre','alemzin-chef-email.png','alemzin-chef-reserva'),
  ]);
  const institucion=String(input.institucion||'Visitas').trim()||'Visitas';
  const horaCorte=horaCorteReservaParaInstitucion(reglas,institucion);
  const reglaCorte=`Para reservar el día siguiente, el corte es a las ${String(horaCorte).padStart(2,'0')}:00 hrs del día anterior.`;
  const transfer=/transfer/i.test(String(input.method||''));
  const link=input.pagoToken?enlaceComprobante(input.origin,input.pagoToken):'';
  const choices=input.choices||[];
  const detalle=choices.map((item)=>`<tr><td style="padding:7px 9px">${escCorreo(item.fecha)}</td><td style="padding:7px 9px">${escCorreo(item.servicio)}</td><td style="padding:7px 9px">${escCorreo(item.tipo_opcion||'')}</td><td style="padding:7px 9px">${escCorreo(item.plato)}</td></tr>`).join('');

  const bancoRows=bancaria?[
    fila('Titular',bancaria.titular),
    fila('RUT',bancaria.rut),
    fila('Banco',bancaria.banco),
    fila('Tipo de cuenta',bancaria.tipoCuenta),
    fila('N° de cuenta',bancaria.numeroCuenta),
    fila('Correo de comprobantes',bancaria.correoComprobantes),
  ].join(''):'';

  const cabeceraHtml=`
    ${headerInline?'<div style="margin:0;text-align:center"><img src="cid:cabecera-reserva" alt="ALEMSI · Casino Mamuil Malal · Servicio de Alimentación" width="680" style="display:block;width:100%;max-width:680px;height:auto;border:0"/></div>':''}
    ${logoInline?'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#ffffff"><tr><td style="padding:10px 14px;text-align:center"><img src="cid:alemsi-logo-reserva" alt="ALEMSI" width="205" style="display:inline-block;width:205px;max-width:48%;height:auto;border:0;vertical-align:middle"/><div style="display:inline-block;max-width:48%;margin-left:12px;vertical-align:middle;text-align:left"><div style="font-size:16px;line-height:1.2;font-weight:800;color:#0B2D5B">CASINO MAMUIL MALAL</div><div style="margin-top:3px;font-size:11px;line-height:1.2;font-weight:700;color:#0D9B91">SERVICIO DE ALIMENTACIÓN</div></div></td></tr></table>':''}
  `;

  const html=correoHtmlEstandar('Reserva confirmada',`
    ${input.nombre?`<p style="margin:0 0 12px;font-size:14px;color:#42515a">Hola <b>${escCorreo(input.nombre)}</b>,</p>`:''}
    <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#42515a">Tu reserva fue registrada correctamente.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">
      ${fila('Código / referencia',input.codigo)}
      ${fila('RUT',input.rut||'')}
      ${fila('Método de pago',input.method||'')}
      ${fila('Monto a pagar',money(Number(input.total||0)))}
    </table>
    ${detalle?`<div style="margin-top:20px;font-weight:800;color:#0B2D5B">Detalle de la reserva</div><table role="presentation" width="100%" style="margin-top:8px;border-collapse:collapse;border:1px solid #d7e1dc;font-size:13px"><tr style="background:#eef7f6;font-weight:800;color:#0B2D5B"><td style="padding:7px 9px">Fecha</td><td style="padding:7px 9px">Servicio</td><td style="padding:7px 9px">Opción</td><td style="padding:7px 9px">Plato</td></tr>${detalle}</table>`:''}
    ${transfer?`<div style="margin-top:20px;font-weight:800;color:#0B2D5B">Datos bancarios vigentes</div>${bancoRows?`<table role="presentation" width="100%" style="margin-top:8px;border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">${bancoRows}</table>`:`<div style="margin-top:8px;padding:12px;background:#fff8e8;border:1px solid #f0d89a;border-radius:8px;font-size:13px">No fue posible recuperar datos bancarios activos. No se muestran datos inventados.</div>`}`:''}
    ${link?`<div style="margin-top:22px;text-align:center"><a href="${escCorreo(link)}" style="display:inline-block;background:#0D9B91;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:8px">Subir comprobante de pago</a></div>`:''}
    <div style="margin-top:18px;padding:13px 15px;background:#f7faf8;border:1px solid #d7e1dc;color:#24434a;font-size:13px;line-height:1.55"><b>Reglas de reserva</b><br/>• ${escCorreo(reglaCorte)}<br/>• El corte es por día y no depende de la hora del servicio.</div>
    <div style="margin-top:12px;padding:13px 15px;background:#eef7f6;border-left:4px solid #0D9B91;color:#24434a;font-size:13px;line-height:1.45"><b>Importante:</b> conserva este correo y el código de reserva como respaldo. El PDF adjunto contiene el detalle de la reserva.</div>
    ${alemzinInline?'<div style="margin-top:20px;text-align:center"><img src="cid:alemzin-chef-reserva" alt="Alemzín Chef · ALEMSI" width="180" style="display:inline-block;width:180px;max-width:65%;height:auto;border:0"/><div style="margin-top:6px;font-size:13px;font-weight:800;color:#0D9B91">¡Buen provecho!</div></div>':''}
  `,'CASINO MAMUIL',cabeceraHtml);

  const bankText=bancaria?[
    bancaria.titular&&`Titular: ${bancaria.titular}`,
    bancaria.rut&&`RUT: ${bancaria.rut}`,
    bancaria.banco&&`Banco: ${bancaria.banco}`,
    bancaria.tipoCuenta&&`Tipo de cuenta: ${bancaria.tipoCuenta}`,
    bancaria.numeroCuenta&&`N° de cuenta: ${bancaria.numeroCuenta}`,
    bancaria.correoComprobantes&&`Correo de comprobantes: ${bancaria.correoComprobantes}`,
  ].filter(Boolean).join('\n'):'';

  const text=[
    'Reserva confirmada',
    input.nombre?`Comensal: ${input.nombre}`:'',
    `Código / referencia: ${input.codigo}`,
    input.rut?`RUT: ${input.rut}`:'',
    `Método de pago: ${input.method||''}`,
    `Monto a pagar: ${money(Number(input.total||0))}`,
    ...choices.map((item)=>`${item.fecha} · ${item.servicio} · ${item.tipo_opcion||''} · ${item.plato}`),
    transfer&&bankText?`Datos bancarios:\n${bankText}`:'',
    link?`Subir comprobante: ${link}`:'',
    `Reglas de reserva:\n- ${reglaCorte}\n- El corte es por día y no depende de la hora del servicio.`,
    '¡Buen provecho! · ALEMSI Casino Mamuil Malal',
  ].filter(Boolean).join('\n\n');

  const pdf=await generarReservaPdf({codigo:input.codigo,rut:input.rut,total:input.total,choices:input.choices});
  const attachments:SmtpAttachment[]=[
    {filename:`Reserva-${input.codigo}.pdf`,contentType:'application/pdf',content:pdf},
    ...(headerInline?[headerInline]:[]),
    ...(logoInline?[logoInline]:[]),
    ...(alemzinInline?[alemzinInline]:[]),
  ];
  return enviarCorreoSmtp({
    to:input.correo,
    subject:`Reserva confirmada ${input.codigo} · ALEMSI`,
    text,
    html,
    attachments,
  });
}
