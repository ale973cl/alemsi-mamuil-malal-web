import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getSession } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { listarRecetas } from '@/lib/db/recetas';
import { cargarBrandingPdf,dibujarBrandingPdf } from '@/lib/pdf-branding';

export const dynamic='force-dynamic';
const LETTER:[number,number]=[612,792];
const NAVY=rgb(11/255,59/255,120/255),GREEN=rgb(8/255,122/255,70/255),TEAL=rgb(13/255,155/255,145/255),LIGHT=rgb(247/255,250/255,248/255),LINE=rgb(203/255,217/255,211/255),TEXT=rgb(20/255,35/255,45/255),WARN=rgb(160/255,95/255,0);
function validDate(v:string|null){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v));}
function visibleDate(v:string){const [y,m,d]=v.split('-');return `${d}-${m}-${y}`;}
function safe(v:unknown){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim();}
function key(v:string){return safe(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL');}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const words=safe(text).split(/\s+/).filter(Boolean),lines:string[]=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines.length?lines:['—'];}
function fmt(v:number){return new Intl.NumberFormat('es-CL',{maximumFractionDigits:3}).format(v);}
function racionesConMargen(base:number,pct:number){return Math.ceil(base*(1+Math.max(0,pct)/100));}
function cantidadConMerma(neta:number,pct:number){const merma=Math.max(0,Math.min(99.99,pct));return merma>0?neta/(1-merma/100):neta;}

export async function GET(req:Request){
  const user=await getSession();
  if(!user||user.rol!=='Cocina') return NextResponse.json({error:'No autorizado'},{status:401});
  const url=new URL(req.url),fecha=url.searchParams.get('fecha'),platoFiltro=safe(url.searchParams.get('plato')),servicioFiltro=safe(url.searchParams.get('servicio'));
  if(!validDate(fecha)) return NextResponse.json({error:'Fecha inválida'},{status:400});
  const [produccion,recetas]=await Promise.all([detalleProduccionFecha(fecha!),listarRecetas()]);
  const activas=recetas.filter(r=>r.activo);
  const filas=produccion.filter(r=>(!platoFiltro||key(r.plato)===key(platoFiltro))&&(!servicioFiltro||key(r.servicio)===key(servicioFiltro)));
  const grupos=[...new Set(filas.map(r=>`${r.servicio}|||${r.plato}`))].map(k=>{const [servicio,plato]=k.split('|||');const rows=filas.filter(r=>r.servicio===servicio&&r.plato===plato);const receta=activas.find(x=>key(x.plato)===key(plato))||null;const reservas=rows.length;const margen=receta?.margen_produccion_pct||0;const merma=receta?.merma_pct||0;const raciones=racionesConMargen(reservas,margen);return{servicio,plato,reservas,raciones,margen,merma,receta};});

  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),branding=await cargarBrandingPdf(pdf);let page!:PDFPage,y=0;const margin=34,width=LETTER[0]-margin*2;
  const header=()=>{y=dibujarBrandingPdf({page,branding,width:LETTER[0],height:LETTER[1],regular,bold,title:'RECETAS DE PRODUCCIÓN',margin});page.drawText(`Fecha: ${visibleDate(fecha!)} · Fuente: producción real del día`,{x:margin,y,size:8,font:regular,color:TEXT});page.drawLine({start:{x:margin,y:y-10},end:{x:LETTER[0]-margin,y:y-10},thickness:1.5,color:TEAL});y-=24;};
  const addPage=()=>{page=pdf.addPage(LETTER);header();};
  const need=(h:number)=>{if(y-h<margin+20)addPage();};addPage();
  if(!grupos.length){page.drawText('No hay producción registrada para la selección indicada.',{x:margin,y:y-10,size:10,font:bold,color:TEXT});}
  for(const g of grupos){
    need(130);page.drawRectangle({x:margin,y:y-72,width,height:72,color:LIGHT,borderColor:LINE,borderWidth:.7});page.drawText(`${g.servicio.toUpperCase()} · ${g.reservas} RESERVAS · ${g.raciones} RACIONES A PRODUCIR`,{x:margin+10,y:y-18,size:8,font:bold,color:GREEN});
    wrap(g.plato,bold,12,width-20).slice(0,2).forEach((line,i)=>page.drawText(line,{x:margin+10,y:y-38-i*13,size:12,font:bold,color:NAVY}));page.drawText(`Margen del plato: ${fmt(g.margen)}% · Merma del plato: ${fmt(g.merma)}%`,{x:margin+10,y:y-64,size:7.5,font:bold,color:TEAL});y-=86;
    if(!g.receta){page.drawText('RECETA ESTÁNDAR PENDIENTE DE CARGA POR ADMINISTRACIÓN DE CASINO.',{x:margin,y:y-10,size:8.5,font:bold,color:WARN});y-=30;continue;}
    const factor=g.raciones/g.receta.porciones_base;page.drawText(`Base estándar: ${g.receta.porciones_base} porciones · Producción con margen: ${g.raciones} · Factor: ${fmt(factor)}`,{x:margin,y:y-6,size:8,font:regular,color:TEXT});y-=22;
    page.drawText('INGREDIENTES AJUSTADOS',{x:margin,y:y-5,size:8,font:bold,color:TEAL});y-=17;
    for(const item of g.receta.ingredientes){need(26);const neta=item.cantidad*factor;const final=cantidadConMerma(neta,g.merma);page.drawText(safe(item.ingrediente),{x:margin+6,y:y-4,size:8,font:bold,color:TEXT});const qty=`${fmt(final)} ${safe(item.unidad)||''}`.trim();page.drawText(qty,{x:LETTER[0]-margin-regular.widthOfTextAtSize(qty,8),y:y-4,size:8,font:bold,color:TEXT});if(g.merma>0){const detalle=`Neto ${fmt(neta)} · merma ${fmt(g.merma)}%`;page.drawText(detalle,{x:margin+6,y:y-14,size:6.5,font:regular,color:TEXT});}page.drawLine({start:{x:margin,y:y-20},end:{x:LETTER[0]-margin,y:y-20},thickness:.3,color:LINE});y-=26;}
    y-=7;page.drawText('PREPARACIÓN ESTÁNDAR',{x:margin,y:y-4,size:8,font:bold,color:TEAL});y-=16;for(const line of wrap(g.receta.preparacion,regular,8,width)){need(12);page.drawText(line,{x:margin+6,y:y-3,size:8,font:regular,color:TEXT});y-=11;}y-=18;
  }
  const bytes=await pdf.save();const base=platoFiltro?`Receta-${safe(platoFiltro).replace(/[^a-zA-Z0-9_-]+/g,'-')}`:'Recetas-dia';const filename=`ALEMSI-${base}-${fecha}.pdf`;
  return new NextResponse(Buffer.from(bytes),{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'no-store'}});
}