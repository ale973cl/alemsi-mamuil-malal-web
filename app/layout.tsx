import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALEMSI · Mamuil Malal',
  description: 'Sistema corporativo de alimentación Mamuil Malal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsapp=String(process.env.NEXT_PUBLIC_ARAUCANIA_SHOP_WHATSAPP_URL||'').trim();
  return (
    <html lang="es">
      <body>
        {children}
        <footer className="border-t border-[#A6B0AA]/25 bg-[#FFFDF8] px-4 py-4 text-center text-xs text-[#6B7570]">
          <span>Desarrollado por </span>
          {whatsapp?<a href={whatsapp} target="_blank" rel="noreferrer" className="font-bold text-[#0B2D5B] underline underline-offset-2">AraucaníaShop Soluciones Digitales</a>:<span className="font-bold text-[#0B2D5B]">AraucaníaShop Soluciones Digitales</span>}
        </footer>
      </body>
    </html>
  );
}
