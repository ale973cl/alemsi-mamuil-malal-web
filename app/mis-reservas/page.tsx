import ComprobanteReservaLink from '@/components/ComprobanteReservaLink';
import ComensalNav from '@/components/ComensalNav';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { listarMisReservas } from '@/lib/db/comensal-gestion';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { cancelacionDirectaHabilitada } from '@/lib/reglas/reserva';
import { cancelarAction, solicitarAnulacionExtraordinariaAction, solicitarNoConsumoDiaAction } from './actions';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{rut?:string}>}){
  const q=await searchParams;
  const session=await getComensalSession();
  const rut=session?.rut||q.rut||'';
  let data:any=null,error='';
  if(rut){try{data=await listarMisReservas(rut)}catch(e){error=e instanceof Error?e.message:'Error'}}
  const reglas=await obtenerReglasReserva();

  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8">
    <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">COMENSAL</p><h1 className="text-2xl font-black">Mis reservas</h1><p className="text-sm text-[#6B7570]">Gestiona aquí tus servicios, pago y comprobante.</p></div>
        <div className="flex flex-wrap gap-2"><a href="/reserva" className="rounded-lg border px-3 py-2 text-sm font-bold">Nueva reserva</a>{session&&<ComensalNav backHref="/reserva"/>}</div>
      </div>
      {session?<div className="mt-5 rounded-xl bg-[#1DB954]/10 p-3 text-sm"><b>Sesión activa.</b> RUT {session.rut}. No necesitas ingresarlo nuevamente.</div>:<form className="mt-5 flex gap-2"><input name="rut" defaultValue={rut} placeholder="RUT" className="min-h-11 flex-1 rounded-lg border px-3"/><button className="rounded-lg bg-[#1DB954] px-4 font-black">Consultar</button></form>}
      {error&&<div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

      {data&&<div className="mt-5 space-y-4">{data.cab.map((c:any)=>{
        const lineas=data.lineas.filter((r:any)=>r.referencia_reserva===c.referencia_reserva);
        const activas=lineas.filter((r:any)=>String(r.estado_reserva||'ACTIVA')==='ACTIVA');
        const fechasActivas=[...new Set(activas.map((r:any)=>String(r.fecha)))];
        return <article key={c.referencia_reserva} className="rounded-xl border p-4">
          <div className="grid gap-2 md:grid-cols-4"><b>{c.codigo_reserva}</b><span>{c.desde} → {c.hasta}</span><span>{c.servicios_activos} activos</span><span>{c.estado_pago}</span></div>
          {c.pago_token&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F6F3EA] p-3"><span className="text-sm"><b>Comprobante:</b> {c.comprobante_estado||'Sin comprobante'}</span><ComprobanteReservaLink token={c.pago_token} estado={c.comprobante_estado}/></div>}

          <div className="mt-3 space-y-2">{lineas.map((r:any)=>{
            const activa=String(r.estado_reserva||'ACTIVA')==='ACTIVA';
            const directa=activa&&cancelacionDirectaHabilitada(String(r.fecha),String(r.servicio),Number(reglas.cancelacion_directa_horas));
            return <div key={r.id} className="rounded-lg bg-[#F6F3EA] p-3">
              <div className="grid gap-2 md:grid-cols-[100px_120px_1fr_120px_auto]"><span>{r.fecha}</span><b>{r.servicio}</b><span>{r.plato_reservado}</span><span>{r.estado_reserva||'ACTIVA'}</span>{directa?<form action={cancelarAction}><input type="hidden" name="rut" value={rut}/><input type="hidden" name="id" value={r.id}/><button className="rounded-lg border border-[#D4AF37] px-3 py-1 font-bold">Cancelar</button></form>:<span className="text-xs text-[#6B7570]">{activa?'Fuera de plazo directo':'Histórico'}</span>}</div>
              {activa&&!directa&&<details className="mt-2 rounded-lg border bg-white p-2"><summary className="cursor-pointer text-sm font-bold">Solicitar anulación extraordinaria de este servicio</summary><form action={solicitarAnulacionExtraordinariaAction} className="mt-2 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="rut" value={rut}/><input type="hidden" name="id" value={r.id}/><input name="motivo" required minLength={5} placeholder="Motivo de la solicitud" className="min-h-10 flex-1 rounded-lg border px-3"/><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-bold text-white">Enviar a Admin Casino</button></form></details>}
            </div>
          })}</div>

          {fechasActivas.length>0&&<details className="mt-4 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-3"><summary className="cursor-pointer font-black">No consumiré un día completo</summary><p className="mt-1 text-sm text-[#6B7570]">Esta solicitud requiere autorización de Admin Casino y, si se aprueba, descuenta todos los servicios activos de ese día del motor de Producción.</p><form action={solicitarNoConsumoDiaAction} className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]"><input type="hidden" name="rut" value={rut}/><select name="fecha" required className="rounded-lg border bg-white px-3 py-2">{fechasActivas.map((fecha:any)=><option key={String(fecha)} value={String(fecha)}>{String(fecha)}</option>)}</select><input name="motivo" required minLength={5} placeholder="Motivo de no consumo" className="rounded-lg border px-3 py-2"/><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-bold text-white">Solicitar anulación del día</button></form></details>}
        </article>
      })}</div>}
    </div>
  </main>
}
