import Link from 'next/link';
import { cerrarSesionComensalAction } from '@/app/actions/comensal-session';

export default function ComensalNav({backHref='/reserva',backLabel='Volver'}:{backHref?:string;backLabel?:string}){
  return <div className="flex flex-wrap items-center gap-2">
    <Link href={backHref} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold">← {backLabel}</Link>
    <form action={cerrarSesionComensalAction}><button className="rounded-lg border border-[#9B2C2C]/40 bg-white px-3 py-2 text-sm font-bold text-[#9B2C2C]">Cerrar sesión</button></form>
  </div>;
}
