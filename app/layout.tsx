import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALEMSI · Mamuil Malal',
  description: 'Plataforma de reservas del Casino Mamuil Malal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <footer className="border-t border-[#A6B0AA]/30 bg-[#FFFDF8] px-4 py-3 text-center text-xs text-[#6B7570] print:hidden">
          Desarrollado por{' '}
          <a
            href="https://wa.me/56997568377?text=Hola%2C%20quisiera%20informaci%C3%B3n%20sobre%20soluciones%20digitales."
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#0D9B91] underline-offset-2 hover:underline"
            aria-label="Contactar a AraucaniaShop Soluciones Digitales por WhatsApp"
          >
            AraucaniaShop Soluciones Digitales
          </a>
        </footer>
      </body>
    </html>
  );
}
