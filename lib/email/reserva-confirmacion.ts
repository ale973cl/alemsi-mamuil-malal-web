import 'server-only';
import { obtenerConfiguracionBancariaActiva, type ConfiguracionBancariaActiva } from '@/lib/db/configuracion-operativa';
import { correoHtmlEstandar, escCorreo } from '@/lib/email/standard-layout';
import { enviarCorreoSmtp, type SmtpDelivery } from '@/lib/email/smtp';
import { generarReservaPdf } from '@/lib/email/reserva-pdf';

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

function datosBancarios(configuracion:ConfiguracionBancariaActiva|null){
  return [
    ['Titular',configuracion?.titular||process.env.TRANSFER_HOLDER],
    ['RUT',configuracion?.rut||process.env.TRANSFER_RUT],
    ['Banco',configuracion?.banco||process.env.TRANSFER_BANK],
    ['Tipo de cuenta',configuracion?.tipoCuenta||process.env.TRANSFER_ACCOUNT_TYPE],
    ['N° de cuenta',configuracion?.numeroCuenta||process.env.TRANSFER_ACCOUNT_NUMBER],
    ['Correo de comprobantes',configuracion?.correoComprobantes||process.env.TRANSFER_EMAIL],
  ] as const;
}

export async function notificarReservaConfirmadaDinamica(input:ReservaConfirmacionInput):Promise<SmtpDelivery>{
  const transfer=/transfer/i.test(String(input.method||''));
  const link=transfer&&input.pagoToken?enlaceComprobante(input.origin,input.pagoToken):'';
  const choices=input.choices||[];
  const detalle=choices.map((item)=>`<tr><td style="padding:7px 9px">${escCorreo(item.fecha)}</td><td style="padding:7px 9px">${escCorreo(item.servicio)}</td><td style="padding:7px 9px">${escCorreo(item.tipo_opcion||'')}</td><td style="padding:7px 9px">${escCorreo(item.plato)}</td></tr>`).join('');
  const configuracionBancaria=transfer?await obtenerConfiguracionBancariaActiva():null;
  const banco=datosBancarios(configuracionBancaria);
  const bancoRows=banco.map(([label,value])=>fila(label,String(value||''))).join('');
  const bankText=banco.filter(([,value])=>String(value||'').trim()).map(([label,value])=>`${label}: ${String(value)}`).join('\n');

  const html=correoHtmlEstandar('Reserva confirmada',`
    ${input.nombre?`<p style="margin:0 0 12px;font-size:14px;color:#42515a">Hola <b>${escCorreo(input.nombre)}</b>,</p>`:''}
    <div style="margin:0 0 18px;padding:15px 16px;background:#eef7f6;border-left:4px solid #0D9B91;color:#24434a;font-size:15px;line-height:1.5"><b>Tu reserva quedó registrada correctamente.</b><br>Revisa a continuación las fechas, servicios y forma de pago.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:8px 0;margin:0 -8px 4px;width:calc(100% + 16px)">
      <tr>
        <td width="50%" style="padding:13px 14px;vertical-align:top;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><div style="font-size:11px;line-height:16px;color:#5b6670;text-transform:uppercase;letter-spacing:.4px">Método de pago</div><div style="margin-top:3px;font-size:15px;line-height:21px;font-weight:800;color:#0B2D5B">${escCorreo(input.method||'No informado')}</div></td>
        <td width="50%" style="padding:13px 14px;vertical-align:top;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px"><div style="font-size:11px;line-height:16px;color:#5b6670;text-transform:uppercase;letter-spacing:.4px">Monto a pagar</div><div style="margin-top:3px;font-size:17px;line-height:21px;font-weight:800;color:#087A46">${escCorreo(money(Number(input.total||0)))}</div></td>
      </tr>
    </table>
    ${detalle?`<div style="margin-top:20px;font-size:16px;font-weight:800;color:#0B2D5B">Detalle de la reserva</div><table role="presentation" width="100%" style="margin-top:8px;border-collapse:collapse;border:1px solid #d7e1dc;font-size:13px"><tr style="background:#eef7f6;font-weight:800;color:#0B2D5B"><td style="padding:8px 9px">Fecha</td><td style="padding:8px 9px">Servicio</td><td style="padding:8px 9px">Opción</td><td style="padding:8px 9px">Plato</td></tr>${detalle}</table>`:''}
    ${transfer?`<div style="margin-top:20px;font-weight:800;color:#0B2D5B">Datos bancarios</div>${bancoRows?`<table role="presentation" width="100%" style="margin-top:8px;border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">${bancoRows}</table>`:`<div style="margin-top:8px;padding:12px;background:#fff8e8;border:1px solid #f0d89a;border-radius:8px;font-size:13px">Los datos bancarios deben estar configurados por Administración.</div>`}`:''}
    ${transfer?`<div style="margin-top:14px;padding:13px 15px;background:#eef7f6;border-left:4px solid #0D9B91;color:#24434a;font-size:13px;line-height:1.55"><b>Pago por transferencia:</b> no es obligatorio pagar antes del consumo. Cuando realices la transferencia, utiliza el código de reserva como referencia y carga el comprobante para que Finanzas pueda identificarlo.</div>`:''}
    ${!transfer&&Number(input.total||0)>0?`<div style="margin-top:20px;padding:13px 15px;background:#eef7f6;border:1px solid #cfe5df;color:#24434a;font-size:13px;line-height:1.55"><b>Pago en la instalación:</b> podrás pagar con débito o mediante código QR. No necesitas realizar una transferencia ni cargar un comprobante.</div>`:''}
    ${link?`<div style="margin-top:22px;text-align:center"><a href="${escCorreo(link)}" style="display:inline-block;background:#0D9B91;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:8px">Subir comprobante de pago</a></div>`:''}
    <table role="presentation" width="100%" style="margin-top:20px;border-collapse:collapse;border-top:1px solid #d7e1dc;font-size:12px;color:#5b6670">
      ${fila('Código de reserva',input.codigo)}
      ${fila('RUT',input.rut||'')}
    </table>
    <div style="margin-top:18px;padding:13px 15px;background:#f7faf8;border:1px solid #d7e1dc;color:#24434a;font-size:13px;line-height:1.55"><b>Importante:</b> conserva este correo y el código de reserva como respaldo.</div>
  `);

  const text=[
    'Reserva confirmada',
    input.nombre?`Comensal: ${input.nombre}`:'',
    `Código / referencia: ${input.codigo}`,
    input.rut?`RUT: ${input.rut}`:'',
    `Método de pago: ${input.method||''}`,
    `Monto a pagar: ${money(Number(input.total||0))}`,
    ...choices.map((item)=>`${item.fecha} · ${item.servicio} · ${item.tipo_opcion||''} · ${item.plato}`),
    transfer&&bankText?`Datos bancarios:\n${bankText}`:'',
    transfer?'Pago por transferencia: no es obligatorio pagar antes del consumo. Usa el código de reserva como referencia y carga el comprobante para su identificación.':'',
    !transfer&&Number(input.total||0)>0?'Pago en la instalación: débito o código QR. No necesitas realizar una transferencia ni cargar un comprobante.':'',
    link?`Subir comprobante: ${link}`:'',
    'Conserva este correo y el código de reserva como respaldo.',
  ].filter(Boolean).join('\n\n');

  const attachments=[];
  try{
    const pdf=await generarReservaPdf({
      codigo:input.codigo,
      rut:input.rut,
      nombre:input.nombre,
      institucion:input.institucion,
      method:input.method,
      total:input.total,
      choices,
    });
    attachments.push({filename:`Reserva-${input.codigo}.pdf`,contentType:'application/pdf',content:pdf});
    console.info('RESERVA_PDF_OK');
  }catch{
    console.error('RESERVA_PDF_ERROR');
  }

  console.info('RESERVA_EMAIL_DIRECT_START');
  const delivery=await enviarCorreoSmtp({
    to:input.correo,
    subject:`Reserva confirmada ${input.codigo} · ALEMSI`,
    text,
    html,
    attachments,
  });
  console.info(delivery.ok?'RESERVA_EMAIL_DIRECT_OK':'RESERVA_EMAIL_DIRECT_FAIL');
  return delivery;
}
