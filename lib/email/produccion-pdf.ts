import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { agruparProduccion } from '@/lib/produccion/agrupacion';
import type { ProduccionComensalRow } from '@/lib/db/produccion-vista';

const LETTER:[number,number]=[612,792];const NAVY=rgb(11/255,59/255,120/255);const GREEN=rgb(8/255,122/255,70/255);const TEAL=rgb(13/255,155/255,145/255);const LIGHT=rgb(247/255,250/255,248/255);const LINE=rgb(203/255,217/255,211/255);const TEXT=rgb(20/255,35/255,45/255);
function visibleDate(v:string){const [y,m,d]=v.split('-');return `${d}-${m}-${y}`;}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean);const lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['-'];}

export async function generarProduccionPdf(fecha:string,rows:ProduccionComensalRow[]){
 const grupos=agruparProduccion(rows);const diners=new Set(rows.map(r=>r.rut)).size;const pdf=await PDFDocument.create();const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const margin=30;let page!:PDFPage;let y=0;
 const addPage=()=>{page=pdf.addPage(LETTER);y=LETTER[1]-margin;page.drawText('ALEMSI · CASINO MAMUIL',{x:margin,y:y-2,size:13,font:bold,color:NAVY});page.drawText('REPORTE DIARIO DE PRODUCCION',{x:margin,y:y-19,size:10.5,font:bold,color:NAVY});page.drawText(`Fecha: ${visibleDate(fecha)}   ·   Comensales: ${diners}   ·   Raciones: ${rows.length}`,{x:margin,y:y-35,size:7.5,font:regular,color:TEXT});page.drawLine({start:{x:margin,y:y-45},end:{x:LETTER[0]-margin,y:y-45},thickness:1.5,color:TEAL});y-=60;};
 const need=(h:number)=>{if(y-h<55)addPage();};addPage();
 if(!rows.length){page.drawText('No hay reservas activas con plato para esta fecha.',{x:margin,y,size:10,font:bold,color:TEXT});}
 for(const grupo of grupos){need(32);page.drawText(`${grupo.servicio.toUpperCase()} · ${grupo.total} RACIONES`,{x:margin,y:y-10,size:10,font:bold,color:GREEN});y-=23;
   for(const prep of grupo.preparaciones){const personCount=prep.instituciones.reduce((a,i)=>a+i.personas.length,0);let h=38+prep.instituciones.reduce((acc,i)=>acc+18+Math.max(1,i.personas.length)*10,0);need(h+8);page.drawRectangle({x:margin,y:y-h,width:LETTER[0]-2*margin,height:h,borderColor:LINE,borderWidth:.7});page.drawRectangle({x:margin,y:y-30,width:LETTER[0]-2*margin,height:30,color:LIGHT});page.drawText(`${prep.opcion} · ${prep.total} raciones`,{x:margin+9,y:y-12,size:7.5,font:bold,color:TEAL});const dish=wrap(prep.plato,bold,9,390);dish.slice(0,2).forEach((line,idx)=>page.drawText(line,{x:margin+9,y:y-24-idx*10,size:9,font:bold,color:NAVY}));let cy=y-43;
     for(const inst of prep.instituciones){page.drawText(`${safe(inst.institucion)} · ${inst.personas.length} ${inst.personas.length===1?'racion':'raciones'}`,{x:margin+12,y:cy,size:7,font:bold,color:NAVY});cy-=10;for(const persona of inst.personas){const name=wrap(persona.nombre,regular,7,480)[0];page.drawText(`- ${name}`,{x:margin+22,y:cy,size:7,font:regular,color:TEXT});cy-=10;}cy-=6;}y-=h+9;
   }
 }
 need(42);page.drawLine({start:{x:margin,y:y-5},end:{x:LETTER[0]-margin,y:y-5},thickness:.5,color:LINE});page.drawText('Observaciones: _________________________________________________________________',{x:margin,y:y-20,size:7,font:regular,color:TEXT});page.drawText('Responsable cocina: ___________________________   Hora: __________',{x:margin,y:y-34,size:7,font:regular,color:TEXT});
 return Buffer.from(await pdf.save());
}
