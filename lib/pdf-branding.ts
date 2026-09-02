import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rgb, type PDFDocument, type PDFImage, type PDFPage, type PDFFont } from 'pdf-lib';

export type PdfBranding={header?:PDFImage;logo?:PDFImage};

function esSeptiembreEnChile(fecha=new Date()){
  const mes=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',month:'numeric'}).format(fecha);
  return Number(mes)===9;
}

export async function cargarBrandingPdf(doc:PDFDocument):Promise<PdfBranding>{
  try{
    const headerFilename=esSeptiembreEnChile()?'cabecera-septiembre.png':'cabecera-institucional.png';
    const [headerBytes,logoBytes]=await Promise.all([
      readFile(path.join(process.cwd(),'public','email','header',headerFilename)),
      readFile(path.join(process.cwd(),'public','email','septiembre','alemsi-logo-email.png')),
    ]);
    return{header:await doc.embedPng(headerBytes),logo:await doc.embedPng(logoBytes)};
  }catch{return{};}
}

export function dibujarBrandingPdf(input:{page:PDFPage;branding:PdfBranding;width:number;height:number;regular:PDFFont;bold:PDFFont;title:string;margin?:number}){
  const {page,branding,width,height,regular,bold,title}=input;
  const margin=input.margin??28;
  const navy=rgb(11/255,45/255,91/255);
  const teal=rgb(13/255,155/255,145/255);
  const line=rgb(215/255,225/255,220/255);
  if(branding.header&&branding.logo){
    const natural=width*(branding.header.height/branding.header.width);
    const maxBanner=height>700?182:128;
    const bannerHeight=Math.min(maxBanner,natural);
    page.drawImage(branding.header,{x:0,y:height-bannerHeight,width,height:bannerHeight});
    const stripTop=height-bannerHeight;
    const stripH=58;
    page.drawRectangle({x:0,y:stripTop-stripH,width,height:stripH,color:rgb(1,1,1),borderColor:line,borderWidth:.5});
    const logoW=height>700?136:118;
    const logoH=Math.min(40,logoW*(branding.logo.height/branding.logo.width));
    page.drawImage(branding.logo,{x:margin,y:stripTop-49,width:logoW,height:logoH});
    page.drawText('CASINO MAMUIL MALAL',{x:margin+logoW+18,y:stripTop-26,size:height>700?11:9.5,font:bold,color:navy});
    page.drawText('SERVICIO DE ALIMENTACIÓN',{x:margin+logoW+18,y:stripTop-41,size:height>700?7.5:6.8,font:bold,color:teal});
    const titleSize=height>700?9:8;
    const titleWidth=bold.widthOfTextAtSize(title,titleSize);
    page.drawText(title,{x:Math.max(margin,width-margin-titleWidth),y:stripTop-31,size:titleSize,font:bold,color:navy});
    return stripTop-stripH-20;
  }
  page.drawRectangle({x:0,y:height-72,width,height:72,color:navy});
  page.drawText('ALEMSI · CASINO MAMUIL MALAL',{x:margin,y:height-34,size:13,font:bold,color:rgb(1,1,1)});
  page.drawText('SERVICIO DE ALIMENTACIÓN',{x:margin,y:height-50,size:8,font:bold,color:teal});
  page.drawText(title,{x:width-margin-bold.widthOfTextAtSize(title,9),y:height-42,size:9,font:bold,color:rgb(1,1,1)});
  return height-92;
}
