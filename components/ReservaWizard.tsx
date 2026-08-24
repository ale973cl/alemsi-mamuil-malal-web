'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { cargarMinutaDisponible, confirmarReserva, identificarComensal, registrarNuevoComensal } from '@/app/reserva/actions';
import type { EleccionReserva } from '@/lib/reglas/reserva';

type Perfil = Awaited<ReturnType<typeof identificarComensal>>;
type Minuta = Awaited<ReturnType<typeof cargarMinutaDisponible>>;

type Etapa = 'rut' | 'registro' | 'fechas' | 'dia' | 'revision' | 'resultado';

const ordenarServicios = ['Desayuno', 'Almuerzo', 'Once', 'Cena'];

function mesActual() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const first = `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
  const lastD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const last = `${lastD.getFullYear()}-${p(lastD.getMonth() + 1)}-${p(lastD.getDate())}`;
  return { first, last };
}

function fechaVisible(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' });
}

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export default function ReservaWizard({initialRut=''}:{initialRut?:string}) {
  const [rut, setRut] = useState(initialRut);
  const [perfil, setPerfil] = useState<Extract<Perfil, { ok: true }> | null>(null);
  const [minuta, setMinuta] = useState<Extract<Minuta, { ok: true }> | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('rut');
  const [fechas, setFechas] = useState<string[]>([]);
  const [diaIndex, setDiaIndex] = useState(0);
  const [elecciones, setElecciones] = useState<Record<string, EleccionReserva>>({});
  const [decisiones, setDecisiones] = useState<Record<string, 'si' | 'no'>>({});
  const [metodoPago, setMetodoPago] = useState<'Transferencia bancaria' | 'Débito en la instalación'>('Transferencia bancaria');
  const [confirmado, setConfirmado] = useState(false);
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof confirmarReserva>> | null>(null);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState<{rut:string;rutVisible:string;instituciones:string[]}|null>(null);
  const [registro, setRegistro] = useState({nombre:'',telefono:'',correo:'',institucion:''});
  const [pending, startTransition] = useTransition();

  const rows = minuta?.rows ?? [];
  const fechasDisponibles = useMemo(() => [...new Set(rows.map((r) => r.fecha))].sort(), [rows]);
  const fechaActual = fechas[diaIndex];
  const filasDia = rows.filter((row) => row.fecha === fechaActual);
  const servicios = ordenarServicios.filter((servicio) => filasDia.some((row) => row.servicio === servicio));
  const institucion = perfil?.persona.institucion ?? '';
  const institucionNorm = institucion.trim().toLocaleLowerCase('es-CL');
  const esAlem = ['alemsi', 'alemsi paso fronterizo', 'alemsi administrativos'].includes(institucionNorm);
  const esCoordinador = institucionNorm === 'coordinadores';
  const deudas = perfil?.deudas ?? [];
  const bloqueado = deudas.length > 0;

  async function continuarConPerfil(response:Extract<Perfil,{ok:true}>) {
    setPerfil(response);
    setNuevo(null);
    if (response.deudas.length) { setEtapa('fechas'); return; }
    const { first, last } = mesActual();
    const menu = await cargarMinutaDisponible(response.persona.rut, first, last);
    if (!menu.ok) return setError('error' in menu&&typeof menu.error==='string'?menu.error:'No fue posible cargar la minuta.');
    setMinuta(menu);
    setEtapa('fechas');
  }

  useEffect(()=>{
    if(!initialRut) return;
    let active=true;
    startTransition(async()=>{
      const response=await identificarComensal(initialRut);
      if(!active) return;
      if(!response.ok){setError('error' in response?response.error:'No fue posible recuperar tu sesión.');return;}
      await continuarConPerfil(response);
    });
    return()=>{active=false;};
  // La sesión inicial se procesa una sola vez al montar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initialRut]);

  function resetError() { setError(''); }

  function identificar() {
    resetError();
    startTransition(async () => {
      const response = await identificarComensal(rut);
      if (!response.ok) {
        if('nuevo' in response&&response.nuevo){setNuevo(response);setEtapa('registro');return;}
        return setError(response.error);
      }
      await continuarConPerfil(response);
    });
  }

  function registrar() {
    if(!nuevo)return;
    resetError();
    startTransition(async()=>{
      const response=await registrarNuevoComensal({rut:nuevo.rut,...registro});
      if(!response.ok)return setError(response.error);
      await continuarConPerfil(response);
    });
  }

  function toggleFecha(fecha: string) { setFechas((current) => current.includes(fecha) ? current.filter((x) => x !== fecha) : [...current, fecha].sort()); }
  function key(fecha: string, servicio: string) { return `${fecha}|${servicio}`; }
  function elegir(row: (typeof rows)[number]) { if (!fechaActual) return; const k=key(fechaActual,row.servicio); setDecisiones(c=>({...c,[k]:'si'})); setElecciones(c=>({...c,[k]:{fecha:fechaActual,servicio:row.servicio,plato:row.plato,tipo_opcion:row.tipo_opcion??undefined}})); }
  function noConsumir(servicio:string){ if(!fechaActual)return; const k=key(fechaActual,servicio); setDecisiones(c=>({...c,[k]:'no'})); setElecciones(c=>{const n={...c};delete n[k];return n;}); }
  function continuarFechas(){if(!fechas.length)return setError('Selecciona al menos una fecha.');setError('');setDiaIndex(0);setEtapa('dia');}
  function continuarDia(){const sinDecision=!esAlem?servicios.filter(s=>!decisiones[key(fechaActual,s)]):[];const seleccionadas=servicios.filter(s=>elecciones[key(fechaActual,s)]);if(sinDecision.length)return setError(`Debes indicar Consumiré o No consumiré en: ${sinDecision.join(', ')}.`);if(!seleccionadas.length)return setError(esAlem?'Selecciona al menos una ración para este día. Sin selección no se genera producción.':'Si seleccionas este día debes reservar al menos un plato.');setError('');if(diaIndex<fechas.length-1)setDiaIndex(i=>i+1);else setEtapa('revision');}
  const listaElecciones=Object.values(elecciones).filter(item=>fechas.includes(item.fecha));
  function confirmar(){if(!esAlem&&!confirmado)return setError('Confirma que revisaste fechas, servicios y platos.');setError('');startTransition(async()=>{const response=await confirmarReserva({rut:perfil!.persona.rut,elecciones:listaElecciones,metodoPago});if(!response.ok)return setError(response.error);setResultado(response);setEtapa('resultado');});}

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"><section className="overflow-hidden rounded-3xl border border-[#A6B0AA]/35 bg-[#FFFDF8] shadow-[0_18px_60px_rgba(14,42,35,0.08)]"><div className="border-b border-[#A6B0AA]/25 bg-[#0E2A23] px-5 py-5 text-white sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">Comensal</p><h2 className="mt-1 text-2xl font-extrabold">Reserva de alimentación</h2><p className="mt-2 max-w-2xl text-sm text-white/75">Identificación, minuta publicada, selección por día y confirmación.</p></div><div className="p-5 sm:p-8">
    {etapa==='rut'&&<div className="mx-auto max-w-xl"><label className="block text-sm font-bold text-[#0E2A23]">RUT del comensal</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={rut} onChange={e=>setRut(e.target.value)} onKeyDown={e=>e.key==='Enter'&&identificar()} placeholder="12.345.678-5" autoComplete="off" className="min-h-12 flex-1 rounded-xl border border-[#A6B0AA]/70 bg-white px-4 text-base text-[#071814] shadow-sm"/><button disabled={pending||!rut.trim()} onClick={identificar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] disabled:opacity-50">{pending?'Consultando…':'Continuar'}</button></div></div>}
    {etapa==='registro'&&nuevo&&<div className="mx-auto max-w-2xl"><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Nuevo comensal</p><h3 className="mt-1 text-xl font-extrabold">Completa tu ficha para continuar</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Nombre completo<input value={registro.nombre} onChange={e=>setRegistro({...registro,nombre:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Teléfono móvil<input value={registro.telefono} onChange={e=>setRegistro({...registro,telefono:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Correo<input type="email" value={registro.correo} onChange={e=>setRegistro({...registro,correo:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Institución<select value={registro.institucion} onChange={e=>setRegistro({...registro,institucion:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border bg-white px-3 font-normal"><option value="">Seleccionar</option>{nuevo.instituciones.map(nombre=><option key={nombre}>{nombre}</option>)}</select></label></div><div className="mt-6 flex justify-between gap-3"><button onClick={()=>{setEtapa('rut');setNuevo(null);setError('');}} className="min-h-12 rounded-xl border px-5 font-bold">← Volver</button><button onClick={registrar} disabled={pending||!registro.nombre||!registro.telefono||!registro.correo||!registro.institucion} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-40">Registrar y continuar</button></div></div>}
    {perfil&&etapa!=='rut'&&<div className="mb-6 grid gap-3 rounded-2xl border border-[#1DB954]/25 bg-[#1DB954]/5 p-4 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6B7570]">Comensal identificado</p><h3 className="mt-1 text-xl font-extrabold">{perfil.persona.nombre}</h3><p className="text-sm text-[#6B7570]">{perfil.persona.rutVisible} · {perfil.persona.institucion}</p></div><div><p className="text-xs text-[#6B7570]">{perfil.precio.glosa}</p><p className="text-lg font-extrabold">{esAlem?'Consumo interno':money(perfil.precio.precio)}</p></div></div>}
    {bloqueado&&etapa==='fechas'&&<div className="rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-5"><h3 className="font-extrabold">Nueva reserva bloqueada por pago pendiente</h3><div className="mt-4 space-y-2">{deudas.map(d=><div key={d.referencia_reserva} className="rounded-xl bg-white p-3 text-sm"><b>{d.referencia_reserva}</b> · {money(Number(d.monto_pendiente))} · {d.estados}</div>)}</div></div>}
    {!bloqueado&&etapa==='fechas'&&<div><h3 className="text-xl font-extrabold">Selecciona las fechas</h3><div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-10">{fechasDisponibles.map(fecha=>{const active=fechas.includes(fecha);return <button key={fecha} onClick={()=>toggleFecha(fecha)} className={`min-h-16 rounded-xl border p-2 ${active?'border-[#1DB954] bg-[#1DB954]':'bg-white'}`}><strong>{fecha.slice(-2)}</strong></button>})}</div><div className="mt-6 flex justify-end"><button onClick={continuarFechas} disabled={!fechas.length} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-40">Continuar con {fechas.length||0} día(s)</button></div></div>}
    {etapa==='dia'&&fechaActual&&<div><p className="text-xs font-bold uppercase text-[#1DB954]">Paso 2 · Día {diaIndex+1} de {fechas.length}</p><h3 className="text-xl font-extrabold capitalize">{fechaVisible(fechaActual)}</h3><div className="mt-5 space-y-4">{servicios.map(servicio=>{const k=key(fechaActual,servicio);const opciones=filasDia.filter(row=>row.servicio===servicio);return <article key={servicio} className="rounded-2xl border bg-white p-4"><div className="flex justify-between"><h4 className="font-extrabold">{servicio}</h4>{!esAlem&&<button onClick={()=>noConsumir(servicio)} className="rounded-full border px-3 py-1 text-xs font-bold">No consumiré</button>}</div><div className="mt-3 grid gap-2 md:grid-cols-2">{opciones.map((row,index)=>{const active=elecciones[k]?.plato===row.plato;return <button key={`${row.tipo_opcion}-${index}`} onClick={()=>elegir(row)} className={`rounded-xl border p-3 text-left ${active?'border-[#1DB954] bg-[#1DB954]/10':'bg-[#FFFDF8]'}`}><span className="text-[11px] uppercase text-[#6B7570]">{row.tipo_opcion||'Opción'}</span><strong className="block">{row.plato}</strong></button>})}</div></article>})}</div><div className="mt-6 flex justify-between"><button onClick={()=>diaIndex>0?setDiaIndex(i=>i-1):setEtapa('fechas')} className="min-h-12 rounded-xl border px-5 font-bold">← Volver</button><button onClick={continuarDia} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold">{diaIndex<fechas.length-1?'Guardar y siguiente día →':'Revisar reserva →'}</button></div></div>}
    {etapa==='revision'&&<div><h3 className="text-xl font-extrabold">Revisa y confirma</h3><div className="mt-5 space-y-3">{fechas.map(fecha=><div key={fecha} className="rounded-2xl border bg-white p-4"><h4 className="font-extrabold capitalize">{fechaVisible(fecha)}</h4>{listaElecciones.filter(e=>e.fecha===fecha).map(e=><div key={`${e.fecha}-${e.servicio}`} className="flex justify-between text-sm"><b>{e.servicio}</b><span>{e.plato}</span></div>)}</div>)}</div>{!esAlem&&!esCoordinador&&<label className="mt-5 block text-sm font-bold">Método de pago<select value={metodoPago} onChange={e=>setMetodoPago(e.target.value as typeof metodoPago)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-normal"><option>Transferencia bancaria</option><option>Débito en la instalación</option></select></label>}{!esAlem&&<label className="mt-5 flex gap-3 rounded-xl border p-4 text-sm"><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/><span>Confirmo que revisé las fechas, servicios y platos.</span></label>}<div className="mt-6 flex justify-between"><button onClick={()=>{setDiaIndex(fechas.length-1);setEtapa('dia')}} className="min-h-12 rounded-xl border px-5 font-bold">← Editar</button><button disabled={pending} onClick={confirmar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-50">{pending?'Registrando…':'Confirmar reserva'}</button></div></div>}
    {etapa==='resultado'&&resultado?.ok&&<div className="mx-auto max-w-2xl text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1DB954] text-2xl font-black">✓</div><p className="mt-4 text-xs font-bold uppercase text-[#1DB954]">Reserva confirmada</p><h3 className="mt-1 text-3xl font-black">{resultado.result.codigoReserva}</h3><p className="mt-2 text-sm text-[#6B7570]">Referencia: {resultado.result.referencia}</p>{resultado.result.total>0&&<p className="mt-4 text-xl font-extrabold">Total: {money(resultado.result.total)}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3"><a href="/mis-reservas" className="rounded-xl bg-[#0E2A23] px-6 py-3 font-extrabold text-white">Mis reservas</a><a href="/reclamos" className="rounded-xl border px-6 py-3 font-extrabold">Experiencia del cliente</a></div></div>}
    {error&&<div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
  </div></section><p className="mt-5 text-center text-xs text-[#6B7570]">ALEMSI · Servicios de Higiene y Desinfección</p></div>;
}
