import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getSession } from '@/lib/auth/session';
import { detalleProduccionFecha, type ProduccionComensalRow } from '@/lib/db/produccion-vista';

export const dynamic = 'force-dynamic';

const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,59/255,120/255);
const GREEN=rgb(8/255,122/255,70/255);
const TEAL=rgb(13/255,155/255,145/255);
const LIGHT=rgb(247/255,250/255,248/255);
const LINE=rgb(159/255,185/255,174/255);
const TEXT=rgb(20/255,35/255,45/255);

function validDate(v:string|null){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v));}
function visibleDate(v:string){const [y,m,d]=v.split('-');return `${d}-${m}-${y}`;}
function safe(v:string){return String(v||'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean);const lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['—'];}
function groupDish(rows:ProduccionComensalRow[]){const keys=[...new Set(rows.map(r=>`${r.tipo_opcion||'SIN OPCION'}|||${r.plato}`))];return keys.map(key=>{const [option,dish]=key.split('|||');const people=rows.filter(r=>(r.tipo_opcion||'SIN OPCION')===option&&r.plato===dish);const institutions=[...new Set(people.map(r=>r.institucion))].map(name=>({name,people:people.filter(r=>r.institucion===name)}));return{option,dish,people,institutions};});}

export async function GET(req:Request){
  const user=await getSession();
  if(!user||!['Cocina','AdminCasino','AdminTotal'].includes(user.rol)) return NextResponse.json({error:'No autorizado'},{status:401});
  const url=new URL(req.url);const fecha=url.searchParams.get('fecha');
  if(!validDate(fecha)) return NextResponse.json({error:'Fecha inválida'},{status:400});
  const rows=await detalleProduccionFecha(fecha!);
  const pdf=await PDFDocument.create();const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin=28,gap=10,colW=(LETTER[0]-margin*2-gap)/2;let page!:PDFPage;let y=0;
  const drawHeader=()=>{page.drawText('ALEMSI · CASINO MAMUIL',{x:margin,y:y-2,size:14,font:bold,color:NAVY});page.drawText('REPORTE DIARIO DE PRODUCCIÓN · COCINA',{x:margin,y:y-21,size:11,font:bold,color:NAVY});page.drawText(`Fecha: ${visibleDate(fecha!)}   ·   Total general: ${rows.length} raciones`,{x:margin,y:y-38,size:8,font:regular,color:TEXT});page.drawLine({start:{x:margin,y:y-48},end:{x:LETTER[0]-margin,y:y-48},thickness:2,color:TEAL});y-=62;};
  const addPage=()=>{page=pdf.addPage(LETTER);y=LETTER[1]-margin;drawHeader();};
  const need=(h:number)=>{if(y-h<margin+20)addPage();};
  addPage();
  if(!rows.length)page.drawText('No hay reservas activas con plato para esta fecha.',{x:margin,y:y-10,size:10,font:bold,color:TEXT});
  for(const service of [...new Set(rows.map(r=>r.servicio))]){
    const sr=rows.filter(r=>r.servicio===service);const cards=groupDish(sr);need(34);
    page.drawRectangle({x:margin,y:y-24,width:LETTER[0]-margin*2,height:24,color:service.toLowerCase()==='cena'?NAVY:GREEN});
    page.drawText(service.toUpperCase(),{x:margin+8,y:y-16,size:10,font:bold,color:rgb(1,1,1)});const total=`${sr.length} RACIONES`;page.drawText(total,{x:LETTER[0]-margin-8-bold.widthOfTextAtSize(total,9),y:y-16,size:9,font:bold,color:rgb(1,1,1)});y-=34;
    for(let i=0;i<cards.length;i+=2){const pair=cards.slice(i,i+2);const heights=pair.map(card=>{let h=48;for(const inst of card.institutions){const names=wrap(inst.people.map(p=>p.nombre).join(', '),regular,6.8,colW-82);h+=Math.max(22,10+names.length*8);}return h+23;});const rowH=Math.max(...heights);need(rowH+8);pair.forEach((card,index)=>{const x=margin+index*(colW+gap);const h=heights[index];const top=y;page.drawRectangle({x,y:top-h,width:colW,height:h,borderColor:LINE,borderWidth:0.8});page.drawRectangle({x,y:top-42,width:colW,height:42,color:LIGHT,borderColor:LINE,borderWidth:0.5});page.drawText(card.option.toUpperCase(),{x:x+7,y:top-12,size:6.5,font:bold,color:GREEN});const dishLines=wrap(card.dish,bold,8.5,colW-50);dishLines.slice(0,2).forEach((line,li)=>page.drawText(line,{x:x+7,y:top-25-li*9,size:8.5,font:bold,color:NAVY}));const count=String(card.people.length);page.drawText(count,{x:x+colW-10-bold.widthOfTextAtSize(count,9),y:top-25,size:9,font:bold,color:NAVY});let cy=top-50;for(const inst of card.institutions){const names=wrap(inst.people.map(p=>p.nombre).join(', '),regular,6.8,colW-82);const rh=Math.max(22,10+names.length*8);page.drawLine({start:{x,y:cy+4},end:{x:x+colW,y:cy+4},thickness:0.35,color:LINE});page.drawText(safe(inst.name),{x:x+7,y:cy-6,size:7,font:bold,color:TEXT});names.forEach((line,li)=>page.drawText(line,{x:x+67,y:cy-6-li*8,size:6.8,font:regular,color:TEXT}));const n=String(inst.people.length);page.drawText(n,{x:x+colW-9-bold.widthOfTextAtSize(n,7),y:cy-6,size:7,font:bold,color:TEXT});cy-=rh;}page.drawLine({start:{x,y:top-h+23},end:{x:x+colW,y:top-h+23},thickness:0.5,color:LINE});page.drawText('Entregado',{x:x+7,y:top-h+8,size:7,font:bold,color:TEXT});page.drawRectangle({x:x+colW-19,y:top-h+5,width:10,height:10,borderColor:NAVY,borderWidth:1});});y-=rowH+8;}
    need(30);page.drawRectangle({x:margin,y:y-24,width:LETTER[0]-margin*2,height:24,color:LIGHT,borderColor:LINE,borderWidth:0.6});page.drawText(`TOTAL ${service.toUpperCase()}`,{x:margin+8,y:y-16,size:8,font:bold,color:NAVY});const sv=String(sr.length);page.drawText(sv,{x:LETTER[0]-margin-8-bold.widthOfTextAtSize(sv,8),y:y-16,size:8,font:bold,color:NAVY});y-=34;
  }
  need(42);page.drawText('OBSERVACIONES:',{x:margin,y:y-8,size:7,font:bold,color:NAVY});page.drawLine({start:{x:margin,y:y-20},end:{x:LETTER[0]-margin,y:y-20},thickness:0.5,color:LINE});page.drawText('Responsable cocina: ______________________________     Hora: __________',{x:margin,y:y-36,size:7,font:regular,color:TEXT});
  const bytes=await pdf.save();const filename=`ALEMSI-Produccion-${fecha}.pdf`;
  return new NextResponse(Buffer.from(bytes),{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'no-store'}});
}
