import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

type Choice={fecha:string;servicio:string;plato:string;tipo_opcion?:string};
const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,45/255,91/255),TEAL=rgb(13/255,155/255,145/255),GREEN=rgb(8/255,122/255,70/255);
const LIGHT=rgb(247/255,250/255,248/255),LINE=rgb(215/255,225/255,220/255),TEXT=rgb(20/255,35/255,45/255),MUTED=rgb(91/255,102/255,112/255);

function dateCL(v:string){const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}-${m}-${y}`:v;}
function money(v:number){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0));}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean),lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['-'];}

export async function generarReservaPdf(input:{codigo:string;rut?:string;nombre?:string;institucion?:string;method?:string;total?:number;choices?:Choice[]}){
  const choices=input.choices||[],fechas=[...new Set(choices.map(c=>c.fecha))].sort(),total=Number(input.total||0);
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin=46,contentWidth=LETTER[0]-margin*2;let page!:PDFPage;let y=0;
  const header=()=>{page=pdf.addPage(LETTER);y=LETTER[1]-50;page.drawText('ALEMSI',{x:margin,y,size:15,font:bold,color:NAVY});page.drawText('CASINO MAMUIL MALAL',{x:margin,y:y-17,size:8,font:bold,color:TEAL});page.drawText('CONFIRMACIÓN DE RESERVA',{x:LETTER[0]-margin-190,y:y-2,size:12,font:bold,color:NAVY});page.drawText(`Código ${safe(input.codigo)}`,{x:LETTER[0]-margin-190,y:y-18,size:8,font:regular,color:MUTED});page.drawLine({start:{x:margin,y:y-31},end:{x:LETTER[0]-margin,y:y-31},thickness:1.4,color:TEAL});y-=52;};
  const need=(height:number)=>{if(y-height<55)header();};
  const labelValue=(label:string,value:string,x:number,top:number,width:number)=>{page.drawText(label.toUpperCase(),{x,y:top,size:7,font:bold,color:MUTED});wrap(value||'-',bold,9,width).slice(0,2).forEach((line,index)=>page.drawText(line,{x,y:top-13-index*11,size:9,font:bold,color:TEXT}));};
  const tableHeader=()=>{page.drawRectangle({x:margin,y:y-21,width:contentWidth,height:21,color:NAVY});([['Fecha',margin+8],['Servicio',margin+82],['Opción',margin+160],['Plato reservado',margin+250]] as const).forEach(([label,x])=>page.drawText(label,{x,y:y-14,size:7.5,font:bold,color:rgb(1,1,1)}));y-=21;};

  header();page.drawText('DATOS DE LA RESERVA',{x:margin,y,size:8,font:bold,color:GREEN});y-=17;
  page.drawRectangle({x:margin,y:y-68,width:contentWidth,height:68,color:LIGHT,borderColor:LINE,borderWidth:.7});
  labelValue('Comensal',safe(input.nombre||'-'),margin+10,y-14,225);labelValue('RUT',safe(input.rut||'-'),margin+270,y-14,110);labelValue('Institución',safe(input.institucion||'-'),margin+390,y-14,120);
  labelValue('Método de pago',safe(input.method||'-'),margin+10,y-48,225);labelValue('Días reservados',String(fechas.length),margin+270,y-48,110);labelValue('Total reserva',money(total),margin+390,y-48,120);y-=88;
  page.drawText('DETALLE DE SERVICIOS',{x:margin,y,size:8,font:bold,color:GREEN});y-=15;tableHeader();
  if(!choices.length){page.drawText('No hay detalle disponible para esta reserva.',{x:margin+8,y:y-17,size:8.5,font:regular,color:TEXT});y-=30;}
  for(const choice of choices){const dishLines=wrap(choice.plato,bold,8.2,contentWidth-258),rowHeight=Math.max(27,13+dishLines.length*10);if(y-rowHeight<55){header();page.drawText('DETALLE DE SERVICIOS (CONTINUACIÓN)',{x:margin,y,size:8,font:bold,color:GREEN});y-=15;tableHeader();}page.drawRectangle({x:margin,y:y-rowHeight,width:contentWidth,height:rowHeight,color:rgb(1,1,1),borderColor:LINE,borderWidth:.55});[margin+74,margin+152,margin+242].forEach(x=>page.drawLine({start:{x,y},end:{x,y:y-rowHeight},thickness:.4,color:LINE}));page.drawText(dateCL(choice.fecha),{x:margin+8,y:y-17,size:8,font:regular,color:TEXT});page.drawText(safe(choice.servicio),{x:margin+82,y:y-17,size:8,font:bold,color:NAVY});wrap(choice.tipo_opcion||'Sin opción',regular,8,74).slice(0,2).forEach((line,index)=>page.drawText(line,{x:margin+160,y:y-17-index*10,size:8,font:regular,color:TEXT}));dishLines.forEach((line,index)=>page.drawText(line,{x:margin+250,y:y-17-index*10,size:8.2,font:bold,color:TEXT}));y-=rowHeight;}
  need(88);y-=18;page.drawText('INFORMACIÓN IMPORTANTE',{x:margin,y,size:8,font:bold,color:GREEN});y-=14;page.drawLine({start:{x:margin,y},end:{x:LETTER[0]-margin,y},thickness:.7,color:LINE});y-=14;
  const notas=/transfer/i.test(String(input.method||''))?['Conserva este documento y el código de reserva como respaldo.','El pago por transferencia puede realizarse conforme al procedimiento informado en el correo.','Carga el comprobante desde el enlace incluido en el correo de confirmación.']:['Conserva este documento y el código de reserva como respaldo.','El pago mediante débito o código QR se realiza en la instalación.','Para este medio de pago no necesitas cargar un comprobante de transferencia.'];
  for(const nota of notas){page.drawText('-',{x:margin,y,size:8,font:bold,color:TEAL});page.drawText(nota,{x:margin+12,y,size:8,font:regular,color:TEXT});y-=14;}
  const pages=pdf.getPages();pages.forEach((target,index)=>{target.drawLine({start:{x:margin,y:37},end:{x:LETTER[0]-margin,y:37},thickness:.6,color:LINE});target.drawText('ALEMSI - Casino Mamuil Malal - Confirmación de reserva',{x:margin,y:23,size:7,font:regular,color:MUTED});const label=`Página ${index+1} de ${pages.length}`;target.drawText(label,{x:LETTER[0]-margin-regular.widthOfTextAtSize(label,7),y:23,size:7,font:regular,color:MUTED});});
  return Buffer.from(await pdf.save());
}
