import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

type Choice={fecha:string;servicio:string;plato:string;tipo_opcion?:string};

const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,45/255,91/255);
const TEAL=rgb(13/255,155/255,145/255);
const GREEN=rgb(8/255,122/255,70/255);
const LIGHT=rgb(247/255,250/255,248/255);
const PALE=rgb(238/255,247/255,246/255);
const LINE=rgb(215/255,225/255,220/255);
const TEXT=rgb(20/255,35/255,45/255);
const MUTED=rgb(91/255,102/255,112/255);

function dateCL(v:string){const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}-${m}-${y}`:v;}
function money(v:number){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0));}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean);const lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['—'];}

export async function generarReservaPdf(input:{codigo:string;rut?:string;total?:number;choices?:Choice[]}){
  const choices=input.choices||[];
  const fechas=[...new Set(choices.map(c=>c.fecha))].sort();
  const dias=fechas.length;
  const total=Number(input.total||0);
  const valorDia=dias>0?total/dias:total;
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin=38;
  let page:PDFPage=pdf.addPage(LETTER);
  let y=LETTER[1]-margin;

  const footer=()=>{
    page.drawLine({start:{x:margin,y:34},end:{x:LETTER[0]-margin,y:34},thickness:.6,color:LINE});
    page.drawText('ALEMSI · Casino Mamuil · Documento generado automáticamente',{x:margin,y:21,size:7,font:regular,color:MUTED});
  };
  const header=()=>{
    page.drawRectangle({x:0,y:LETTER[1]-92,width:LETTER[0],height:92,color:NAVY});
    page.drawText('ALEMSI',{x:margin,y:LETTER[1]-43,size:22,font:bold,color:rgb(1,1,1)});
    page.drawText('CASINO MAMUIL',{x:margin,y:LETTER[1]-61,size:9,font:bold,color:rgb(127/255,225/255,214/255)});
    page.drawText('CONFIRMACIÓN DE RESERVA',{x:LETTER[0]-margin-190,y:LETTER[1]-48,size:12,font:bold,color:rgb(1,1,1)});
    page.drawText('Respaldo de alimentación',{x:LETTER[0]-margin-190,y:LETTER[1]-64,size:8,font:regular,color:rgb(225/255,235/255,232/255)});
    y=LETTER[1]-118;
  };
  const newPage=()=>{footer();page=pdf.addPage(LETTER);header();};
  const need=(height:number)=>{if(y-height<58)newPage();};
  header();

  page.drawText('RESUMEN DE LA RESERVA',{x:margin,y,size:9,font:bold,color:GREEN});
  y-=14;
  page.drawRectangle({x:margin,y:y-94,width:LETTER[0]-margin*2,height:94,color:LIGHT,borderColor:LINE,borderWidth:1});
  page.drawText('Código de reserva',{x:margin+14,y:y-20,size:8,font:regular,color:MUTED});
  page.drawText(safe(input.codigo),{x:margin+14,y:y-36,size:13,font:bold,color:NAVY});
  page.drawText('RUT',{x:margin+14,y:y-58,size:8,font:regular,color:MUTED});
  page.drawText(safe(input.rut||'—'),{x:margin+14,y:y-74,size:10,font:bold,color:TEXT});

  const col2=margin+220;
  page.drawText('Valor diario aplicado',{x:col2,y:y-20,size:8,font:regular,color:MUTED});
  page.drawText(money(valorDia),{x:col2,y:y-36,size:11,font:bold,color:TEXT});
  page.drawText('Días reservados',{x:col2,y:y-58,size:8,font:regular,color:MUTED});
  page.drawText(String(dias),{x:col2,y:y-74,size:10,font:bold,color:TEXT});

  const col3=margin+390;
  page.drawText('TOTAL RESERVA',{x:col3,y:y-20,size:8,font:bold,color:GREEN});
  page.drawText(money(total),{x:col3,y:y-43,size:18,font:bold,color:GREEN});
  page.drawText(`${choices.length} servicio${choices.length===1?'':'s'} seleccionado${choices.length===1?'':'s'}`,{x:col3,y:y-67,size:7,font:regular,color:MUTED});
  y-=116;

  page.drawRectangle({x:margin,y:y-38,width:LETTER[0]-margin*2,height:38,color:PALE,borderColor:LINE,borderWidth:1});
  page.drawText('El valor corresponde al día de alimentación.',{x:margin+12,y:y-15,size:8,font:bold,color:NAVY});
  page.drawText('Las selecciones de servicios del mismo día no duplican el cobro diario.',{x:margin+12,y:y-28,size:8,font:regular,color:TEXT});
  y-=58;

  page.drawText('DETALLE DE CONSUMOS',{x:margin,y,size:9,font:bold,color:GREEN});
  y-=18;
  if(!choices.length){page.drawText('No hay detalle disponible para esta reserva.',{x:margin,y,size:9,font:regular,color:TEXT});y-=20;}

  for(const c of choices){
    const option=safe(c.tipo_opcion||'Sin opción');
    const dishLines=wrap(c.plato,bold,9,LETTER[0]-margin*2-24);
    const h=50+(dishLines.length-1)*11;
    need(h+10);
    page.drawRectangle({x:margin,y:y-h,width:LETTER[0]-margin*2,height:h,color:rgb(1,1,1),borderColor:LINE,borderWidth:1});
    page.drawRectangle({x:margin,y:y-22,width:LETTER[0]-margin*2,height:22,color:LIGHT});
    page.drawText(dateCL(c.fecha),{x:margin+10,y:y-15,size:8,font:bold,color:NAVY});
    page.drawText(safe(c.servicio),{x:margin+100,y:y-15,size:8,font:bold,color:GREEN});
    page.drawText(option,{x:margin+205,y:y-15,size:8,font:regular,color:MUTED});
    dishLines.forEach((line,i)=>page.drawText(line,{x:margin+10,y:y-40-i*11,size:9,font:bold,color:TEXT}));
    y-=h+10;
  }

  need(80);
  y-=4;
  page.drawRectangle({x:margin,y:y-58,width:LETTER[0]-margin*2,height:58,color:LIGHT,borderColor:LINE,borderWidth:1});
  page.drawText('INFORMACIÓN IMPORTANTE',{x:margin+12,y:y-17,size:8,font:bold,color:NAVY});
  page.drawText('Conserve este documento como respaldo de su reserva.',{x:margin+12,y:y-32,size:8,font:regular,color:TEXT});
  page.drawText('El comprobante de pago puede cargarse desde el enlace recibido en el correo de confirmación.',{x:margin+12,y:y-45,size:8,font:regular,color:TEXT});

  footer();
  return Buffer.from(await pdf.save());
}
