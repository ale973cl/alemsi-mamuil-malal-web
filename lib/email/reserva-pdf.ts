import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

type Choice={fecha:string;servicio:string;plato:string;tipo_opcion?:string};

const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,59/255,120/255);
const TEAL=rgb(13/255,155/255,145/255);
const GREEN=rgb(8/255,122/255,70/255);
const LIGHT=rgb(247/255,250/255,248/255);
const LINE=rgb(215/255,225/255,220/255);
const TEXT=rgb(20/255,35/255,45/255);

function dateCL(v:string){const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}-${m}-${y}`:v;}
function money(v:number){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0));}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean);const lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['—'];}

export async function generarReservaPdf(input:{codigo:string;rut?:string;total?:number;choices?:Choice[]}){
  const choices=input.choices||[];
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin=36;
  let page:PDFPage=pdf.addPage(LETTER);
  let y=LETTER[1]-margin;

  const header=()=>{
    page.drawText('ALEMSI · CASINO MAMUIL',{x:margin,y:y,size:15,font:bold,color:NAVY});
    y-=20;
    page.drawText('DETALLE DE RESERVA',{x:margin,y:y,size:12,font:bold,color:NAVY});
    y-=12;
    page.drawLine({start:{x:margin,y},end:{x:LETTER[0]-margin,y},thickness:2,color:TEAL});
    y-=24;
  };
  const need=(height:number)=>{if(y-height<margin){page=pdf.addPage(LETTER);y=LETTER[1]-margin;header();}};
  header();

  page.drawRectangle({x:margin,y:y-72,width:LETTER[0]-margin*2,height:72,color:LIGHT,borderColor:LINE,borderWidth:1});
  page.drawText('Código de reserva',{x:margin+12,y:y-20,size:8,font:regular,color:TEXT});
  page.drawText(safe(input.codigo),{x:margin+135,y:y-20,size:10,font:bold,color:NAVY});
  if(input.rut){page.drawText('RUT',{x:margin+12,y:y-40,size:8,font:regular,color:TEXT});page.drawText(safe(input.rut),{x:margin+135,y:y-40,size:9,font:bold,color:TEXT});}
  page.drawText('Deuda total pendiente',{x:margin+12,y:y-60,size:8,font:regular,color:TEXT});
  page.drawText(money(Number(input.total||0)),{x:margin+135,y:y-60,size:11,font:bold,color:GREEN});
  y-=96;

  page.drawText('Detalle reservado',{x:margin,y:y,size:11,font:bold,color:NAVY});
  y-=18;
  if(!choices.length){page.drawText('No hay detalle disponible para esta reserva.',{x:margin,y:y,size:9,font:regular,color:TEXT});y-=18;}

  for(const c of choices){
    const option=safe(c.tipo_opcion||'Sin opción');
    const dishLines=wrap(c.plato,bold,9,LETTER[0]-margin*2-110);
    const h=42+(dishLines.length-1)*10;
    need(h+10);
    page.drawRectangle({x:margin,y:y-h,width:LETTER[0]-margin*2,height:h,borderColor:LINE,borderWidth:1});
    page.drawRectangle({x:margin,y:y-20,width:LETTER[0]-margin*2,height:20,color:LIGHT});
    page.drawText(`${dateCL(c.fecha)} · ${safe(c.servicio)} · ${option}`,{x:margin+10,y:y-14,size:8,font:bold,color:NAVY});
    dishLines.forEach((line,i)=>page.drawText(line,{x:margin+10,y:y-34-i*10,size:9,font:bold,color:TEXT}));
    y-=h+10;
  }

  need(54);
  page.drawLine({start:{x:margin,y:y-8},end:{x:LETTER[0]-margin,y:y-8},thickness:0.8,color:LINE});
  page.drawText('Documento generado automáticamente desde ALEMSI Casino Mamuil.',{x:margin,y:y-24,size:7,font:regular,color:TEXT});
  page.drawText('Conserve este PDF como respaldo del detalle de su reserva.',{x:margin,y:y-36,size:7,font:regular,color:TEXT});

  return Buffer.from(await pdf.save());
}
