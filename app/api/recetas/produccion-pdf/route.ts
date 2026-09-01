import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getSession } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { listarRecetas } from '@/lib/db/recetas';

export const dynamic='force-dynamic';
const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,59/255,120/255),GREEN=rgb(8/255,122/255,70/255),TEAL=rgb(13/255,155/255,145/255),LIGHT=rgb(247/255,250/255,248/255),LINE=rgb(203/255,217/255,211/255),TEXT=rgb(20/255,35/255,45/255),WARN=rgb(160/255,95/255,0);
function validDate(v:string|null){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v));}
function visibleDate(v:string){const [y,m,d]=v.split('-');return `${d}-${m}-${y}`;}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function key(v:string){return safe(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL');}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean),lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['—'];}
function fmt(v:number){return new Intl.NumberFormat('es-CL',{maximumFractionDigits:3}).format(v);}

export async function GET(req:Request){
  const user=await getSession();
  if(!user||user.rol!=='Cocina') return NextResponse.json({error:'No autorizado'},{status:401});
  const url=new URL(req.url),fecha=url.searchParams.get('fecha'),platoFiltro=safe(url.searchParams.get('plato')),servicioFiltro=safe(url.searchParams.get('servicio'));
  if(!validDate(fecha)) return NextResponse.json({error:'Fecha inválida'},{status:400});
  const [produccion,recetas]=await Promise.all([detalleProduccionFecha(fecha!),listarRecetas()]);
  const activas=recetas.filter(r=>r.activo);
  const filas=produccion.filter(r=>(!platoFiltro||key(r.plato)===key(platoFiltro))&&(!servicioFiltro||key(r.servicio)===key(servicioFiltro)));
  const grupos=[...new Set(filas.map(r=>`${r.servicio}|||${r.plato}`))].map(k=>{const [servicio,plato]=k.split('|||');const rows=filas.filter(r=>r.servicio===servicio&&r.plato===plato);const receta=activas.find(x=>key(x.plato)===key(plato))||null;return{servicio,plato,raciones:rows.length,receta};});

  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page!:PDFPage,y=0;const margin=34,width=LETTER[0]-margin*2;
  const header=()=>{page.drawText('ALEMSI · CASINO MAMUIL',{x:margin,y:y-2,size:13,font:bold,color:NAVY});page.drawText('RECETAS DE PRODUCCIÓN',{x:margin,y:y-20,size:11,font:bold,color:NAVY});page.drawText(`Fecha: ${visibleDate(fecha!)} · Fuente: producción real del día`,{x:margin,y:y-36,size:8,font:regular,color:TEXT});page.drawLine({start:{x:margin,y:y-46},end:{x:LETTER[0]-margin,y:y-46},thickness:1.5,color:TEAL});y-=62;};
  const addPage=()=>{page=pdf.addPage(LETTER);y=LETTER[1]-margin;header();};
  const need=(h:number)=>{if(y-h<margin+20)addPage();};addPage();
  if(!grupos.length){page.drawText('No hay producción registrada para la selección indicada.',{x:margin,y:y-10,size:10,font:bold,color:TEXT});}
  for(const g of grupos){
    need(110);page.drawRectangle({x:margin,y:y-54,width,height:54,color:LIGHT,borderColor:LINE,borderWidth:.7});page.drawText(`${g.servicio.toUpperCase()} · ${g.raciones} RACIONES`,{x:margin+10,y:y-18,size:8,font:bold,color:GREEN});
    wrap(g.plato,bold,12,width-20).slice(0,2).forEach((line,i)=>page.drawText(line,{x:margin+10,y:y-36-i*13,size:12,font:bold,color:NAVY}));y-=68;
    if(!g.receta){page.drawText('RECETA ESTÁNDAR PENDIENTE DE CARGA POR ADMINISTRACIÓN DE CASINO.',{x:margin,y:y-10,size:8.5,font:bold,color:WARN});y-=30;continue;}
    const factor=g.raciones/g.receta.porciones_base;page.drawText(`Base estándar: ${g.receta.porciones_base} porciones · Producción: ${g.raciones} · Factor: ${fmt(factor)}`,{x:margin,y:y-6,size:8,font:regular,color:TEXT});y-=22;
    page.drawText('INGREDIENTES AJUSTADOS',{x:margin,y:y-5,size:8,font:bold,color:TEAL});y-=17;
    for(const item of g.receta.ingredientes){need(18);page.drawText(safe(item.ingrediente),{x:margin+6,y:y-4,size:8,font:bold,color:TEXT});const qty=`${fmt(item.cantidad*factor)} ${safe(item.unidad)||''}`.trim();page.drawText(qty,{x:LETTER[0]-margin-regular.widthOfTextAtSize(qty,8),y:y-4,size:8,font:regular,color:TEXT});page.drawLine({start:{x:margin,y:y-9},end:{x:LETTER[0]-margin,y:y-9},thickness:.3,color:LINE});y-=15;}
    y-=7;page.drawText('PREPARACIÓN ESTÁNDAR',{x:margin,y:y-4,size:8,font:bold,color:TEAL});y-=16;for(const line of wrap(g.receta.preparacion,regular,8,width)){need(12);page.drawText(line,{x:margin+6,y:y-3,size:8,font:regular,color:TEXT});y-=11;}y-=18;
  }
  const bytes=await pdf.save();const base=platoFiltro?`Receta-${safe(platoFiltro).replace(/[^a-zA-Z0-9_-]+/g,'-')}`:'Recetas-dia';const filename=`ALEMSI-${base}-${fecha}.pdf`;
  return new NextResponse(Buffer.from(bytes),{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'no-store'}});
}
