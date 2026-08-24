'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { cargarMinutaDisponible, confirmarReserva, identificarComensal, registrarNuevoComensal } from '@/app/reserva/actions';
import type { EleccionReserva } from '@/lib/reglas/reserva';

type Perfil = Awaited<ReturnType<typeof identificarComensal>>;
type Minuta = Awaited<ReturnType<typeof cargarMinutaDisponible>>;
type Etapa = 'rut' | 'registro' | 'fechas' | 'dia' | 'revision' | 'resultado';

const ordenarServicios = ['Desayuno', 'Almuerzo', 'Once', 'Cena'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['L','M','M','J','V','S','D'];

function pad(n:number){return String(n).padStart(2,'0');}
function isoHoy(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function mesHoy(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
function rangoMes(mes:string){const [y,m]=mes.split('-').map(Number);const last=new Date(y,m,0).getDate();return {first:`${y}-${pad(m)}-01`,last:`${y}-${pad(m)}-${pad(last)}`};}
function moverMes(mes:string,delta:number){const [y,m]=mes.split('-').map(Number);const d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
function fechaVisible(iso:string){const [y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)));}
function fechaCorta(iso:string){const [y,m,d]=iso.split('-');return `${d}-${m}-${y}`;}
function money(value:number){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);}

export default function ReservaWizardV2({initialRut=''}:{initialRut?:string}){
  const [rut,setRut]=useState(initialRut);
  const [perfil,setPerfil]=useState<Extract<Perfil,{ok:true}>|null>(null);
  const [minuta,setMinuta]=useState<Extract<Minuta,{ok:true}>|null>(null);
  const [etapa,setEtapa]=useState<Etapa>('rut');
  const [mesCursor,setMesCursor]=useState(mesHoy());
  const [fechas,setFechas]=useState<string[]>([]);
  const [diaIndex,setDiaIndex]=useState(0);
  const [elecciones,setElecciones]=useState<Record<string,EleccionReserva>>({});
  const [decisiones,setDecisiones]=useState<Record<string,'si'|'no'>>({});
  const [metodoPago,setMetodoPago]=useState<'Transferencia bancaria'|'Débito en la instalación'>('Transferencia bancaria');
  const [confirmado,setConfirmado]=useState(false);
  const [resultado,setResultado]=useState<Awaited<ReturnType<typeof confirmarReserva>>|null>(null);
  const [error,setError]=useState('');
  const [nuevo,setNuevo]=useState<{rut:string;rutVisible:string;instituciones:string[]}|null>(null);
  const [registro,setRegistro]=useState({nombre:'',telefono:'',correo:'',institucion:''});
  const [pending,startTransition]=useTransition();

  const rows=minuta?.rows??[];
  const fechasDisponibles=useMemo(()=>new Set(rows.map(r=>r.fecha)),[rows]);
  const fechaActual=fechas[diaIndex];
  const filasDia=rows.filter(row=>row.fecha===fechaActual);
  const servicios=ordenarServicios.filter(servicio=>filasDia.some(row=>row.servicio===servicio));
  const institucion=perfil?.persona.institucion??'';
  const institucionNorm=institucion.trim().toLocaleLowerCase('es-CL');
  const esAlem=['alemsi','alemsi paso fronterizo','alemsi administrativos'].includes(institucionNorm);
  const esCoordinador=institucionNorm==='coordinadores';
  const deudas=perfil?.deudas??[];
  const bloqueado=deudas.length>0;

  const calendario=useMemo(()=>{
    const [y,m]=mesCursor.split('-').map(Number);
    const total=new Date(y,m,0).getDate();
    const firstWeekDay=(new Date(y,m-1,1).getDay()+6)%7;
    const cells:Array<{iso:string;day:number}|null>=Array(firstWeekDay).fill(null);
    for(let d=1;d<=total;d++) cells.push({iso:`${y}-${pad(m)}-${pad(d)}`,day:d});
    while(cells.length%7) cells.push(null);
    return cells;
  },[mesCursor]);

  async function cargarMes(mes:string,persona?:Extract<Perfil,{ok:true}>){
    const p=persona??perfil;
    if(!p||p.deudas.length)return;
    const {first,last}=rangoMes(mes);
    const menu=await cargarMinutaDisponible(p.persona.rut,first,last);
    if(!menu.ok){setError('error'in menu&&typeof menu.error==='string'?menu.error:'No fue posible cargar la minuta.');return;}
    setMinuta(menu);
    setMesCursor(mes);
  }

  async function continuarConPerfil(response:Extract<Perfil,{ok:true}>){
    setPerfil(response);setNuevo(null);setError('');
    if(response.deudas.length){setEtapa('fechas');return;}
    await cargarMes(mesHoy(),response);
    setEtapa('fechas');
  }

  function identificar(){setError('');startTransition(async()=>{const response=await identificarComensal(rut);if(!response.ok){if('nuevo'in response&&response.nuevo){setNuevo(response);setEtapa('registro');return;}setError(response.error);return;}await continuarConPerfil(response);});}
  function registrar(){if(!nuevo)return;setError('');startTransition(async()=>{const response=await registrarNuevoComensal({rut:nuevo.rut,...registro});if(!response.ok){setError(response.error);return;}await continuarConPerfil(response);});}

  useEffect(()=>{if(!initialRut)return;let activo=true;startTransition(async()=>{const response=await identificarComensal(initialRut);if(!activo)return;if(!response.ok){setError('error'in response&&typeof response.error==='string'?response.error:'No fue posible recuperar tu sesión.');return;}await continuarConPerfil(response);});return()=>{activo=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initialRut]);

  function cambiarMes(delta:number){const next=moverMes(mesCursor,delta);setError('');startTransition(()=>cargarMes(next));}
  function toggleFecha(fecha:string){if(!fechasDisponibles.has(fecha))return;setFechas(current=>current.includes(fecha)?current.filter(x=>x!==fecha):[...current,fecha].sort());}
  function key(fecha:string,servicio:string){return `${fecha}|${servicio}`;}
  function elegir(row:(typeof rows)[number]){if(!fechaActual)return;const k=key(fechaActual,row.servicio);setDecisiones(c=>({...c,[k]:'si'}));setElecciones(c=>({...c,[k]:{fecha:fechaActual,servicio:row.servicio,plato:row.plato,tipo_opcion:row.tipo_opcion??undefined}}));}
  function noConsumir(servicio:string){if(!fechaActual)return;const k=key(fechaActual,servicio);setDecisiones(c=>({...c,[k]:'no'}));setElecciones(c=>{const next={...c};delete next[k];return next;});}
  function continuarFechas(){if(!fechas.length){setError('Selecciona al menos una fecha disponible.');return;}setError('');setDiaIndex(0);setEtapa('dia');}
  function continuarDia(){const sinDecision=!esAlem?servicios.filter(s=>!decisiones[key(fechaActual,s)]):[];const seleccionadas=servicios.filter(s=>elecciones[key(fechaActual,s)]);if(sinDecision.length){setError(`Debes indicar Consumiré o No consumiré en: ${sinDecision.join(', ')}.`);return;}if(!seleccionadas.length){setError(esAlem?'Selecciona al menos una ración para este día.':'Si seleccionas este día debes reservar al menos un plato.');return;}setError('');if(diaIndex<fechas.length-1)setDiaIndex(i=>i+1);else setEtapa('revision');}
  const listaElecciones=Object.values(elecciones).filter(item=>fechas.includes(item.fecha));
  function confirmar(){if(!esAlem&&!confirmado){setError('Confirma que revisaste fechas, servicios y platos.');return;}setError('');startTransition(async()=>{const response=await confirmarReserva({rut:perfil!.persona.rut,elecciones:listaElecciones,metodoPago});if(!response.ok){setError(response.error);return;}setResultado(response);setEtapa('resultado');});}

  const [cy,cm]=mesCursor.split('-').map(Number);
  const tituloMes=`${MESES[cm-1]} ${cy}`;
  const hoy=isoHoy();
  const finDeMes=Number(hoy.slice(8,10))>=25&&mesCursor===mesHoy();

  return <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
    <section className="overflow-hidden rounded-2xl border border-[#A6B0AA]/35 bg-[#FFFDF8] shadow-[0_12px_36px_rgba(14,42,35,0.08)] sm:rounded-3xl">
      <div className="border-b border-[#A6B0AA]/25 bg-[#0E2A23] px-4 py-4 text-white sm:px-8 sm:py-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#1DB954]">Comensal</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Reserva de alimentación</h2><p className="mt-1 text-sm text-white/75">Identificación, minuta publicada, selección por día y confirmación.</p></div>
      <div className="p-4 sm:p-8">
        {etapa==='rut'&&<div className="mx-auto max-w-xl"><label className="block text-sm font-bold">RUT del comensal</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={rut} onChange={e=>setRut(e.target.value)} onKeyDown={e=>e.key==='Enter'&&identificar()} placeholder="12.345.678-5" className="min-h-12 flex-1 rounded-xl border px-4 text-base"/><button disabled={pending||!rut.trim()} onClick={identificar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-50">{pending?'Consultando…':'Continuar'}</button></div></div>}

        {etapa==='registro'&&nuevo&&<div className="mx-auto max-w-2xl"><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Nuevo comensal</p><h3 className="mt-1 text-xl font-extrabold">Completa tu ficha</h3><p className="mt-1 text-sm text-[#6B7570]">RUT {nuevo.rutVisible}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Nombre completo<input value={registro.nombre} onChange={e=>setRegistro({...registro,nombre:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Teléfono móvil<input value={registro.telefono} onChange={e=>setRegistro({...registro,telefono:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Correo<input type="email" value={registro.correo} onChange={e=>setRegistro({...registro,correo:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3 font-normal"/></label><label className="text-sm font-bold">Institución<select value={registro.institucion} onChange={e=>setRegistro({...registro,institucion:e.target.value})} className="mt-1 min-h-12 w-full rounded-xl border bg-white px-3 font-normal"><option value="">Seleccionar</option>{nuevo.instituciones.map(n=><option key={n}>{n}</option>)}</select></label></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={()=>{setEtapa('rut');setNuevo(null);setError('');}} className="min-h-12 rounded-xl border px-5 font-bold">← Volver</button><button onClick={registrar} disabled={pending||!registro.nombre||!registro.telefono||!registro.correo||!registro.institucion} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-40">{pending?'Registrando…':'Registrar y continuar'}</button></div></div>}

        {perfil&&etapa!=='rut'&&<div className="mb-5 grid gap-2 rounded-2xl border border-[#1DB954]/25 bg-[#1DB954]/5 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6B7570]">Comensal identificado</p><h3 className="mt-1 text-lg font-extrabold sm:text-xl">{perfil.persona.nombre}</h3><p className="text-sm text-[#6B7570]">{perfil.persona.rutVisible} · {perfil.persona.institucion}</p></div><div className="sm:text-right"><p className="text-xs text-[#6B7570]">{perfil.precio.glosa}</p><p className="font-extrabold">{esAlem?'Consumo interno':money(perfil.precio.precio)}</p></div></div>}

        {bloqueado&&etapa==='fechas'&&<div className="rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-5"><h3 className="font-extrabold">Nueva reserva bloqueada por pago pendiente</h3><p className="mt-1 text-sm text-[#6B7570]">Finanzas libera el RUT al validar el pago.</p><div className="mt-4 space-y-2">{deudas.map(d=><div key={d.referencia_reserva} className="rounded-xl bg-white p-3 text-sm"><b>{d.referencia_reserva}</b> · {money(Number(d.monto_pendiente))} · {d.estados}</div>)}</div></div>}

        {!bloqueado&&etapa==='fechas'&&<div><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 1</p><h3 className="text-xl font-extrabold">Selecciona las fechas</h3></div><p className="text-sm text-[#6B7570]">El mes se muestra completo. Solo los días destacados se pueden reservar.</p></div>
          <div className="mt-5 rounded-2xl border bg-white p-3 sm:p-5"><div className="flex items-center justify-between gap-2"><button onClick={()=>cambiarMes(-1)} disabled={pending} className="min-h-10 rounded-lg border px-3 font-bold">←</button><div className="text-center"><h4 className="text-lg font-black capitalize">{tituloMes}</h4>{finDeMes&&<button onClick={()=>cambiarMes(1)} className="mt-1 text-xs font-bold text-[#0E2A23] underline">Ver mes siguiente →</button>}</div><button onClick={()=>cambiarMes(1)} disabled={pending} className="min-h-10 rounded-lg border px-3 font-bold">→</button></div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">{DIAS.map((d,i)=><div key={`${d}-${i}`} className="py-1 text-[11px] font-black text-[#6B7570]">{d}</div>)}{calendario.map((cell,i)=>{if(!cell)return <div key={`x-${i}`} className="min-h-12 sm:min-h-14"/>;const disponible=fechasDisponibles.has(cell.iso);const active=fechas.includes(cell.iso);const esHoy=cell.iso===hoy;const pasado=cell.iso<hoy;return <button key={cell.iso} disabled={!disponible||pasado||pending} onClick={()=>toggleFecha(cell.iso)} title={disponible?`Disponible ${fechaCorta(cell.iso)}`:`No disponible ${fechaCorta(cell.iso)}`} className={`relative min-h-12 rounded-lg border text-sm font-black transition sm:min-h-14 ${active?'border-[#1DB954] bg-[#1DB954] text-[#071814]':disponible&&!pasado?'border-[#1DB954]/55 bg-[#1DB954]/10 text-[#0E2A23] hover:bg-[#1DB954]/20':'border-[#A6B0AA]/20 bg-[#F4F5F3] text-[#A6B0AA]'} ${esHoy?'ring-2 ring-[#D4AF37] ring-offset-1':''}`}><span>{cell.day}</span>{disponible&&!pasado&&<span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#1DB954]"/>}</button>;})}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7570]"><span><b className="text-[#0E2A23]">{fechas.length}</b> día(s) seleccionados</span><span>Internamente: YYYY-MM-DD · Pantalla: DD-MM-YYYY</span></div></div>
          {!fechasDisponibles.size&&<p className="mt-4 rounded-xl bg-[#A6B0AA]/10 p-4 text-sm text-[#6B7570]">No hay días reservables publicados en este mes. Puedes avanzar al mes siguiente.</p>}
          <div className="mt-5 flex justify-end"><button onClick={continuarFechas} disabled={!fechas.length} className="min-h-12 w-full rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-40 sm:w-auto">Continuar con {fechas.length} día(s)</button></div></div>}

        {etapa==='dia'&&fechaActual&&<div><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 2 · Día {diaIndex+1} de {fechas.length}</p><h3 className="text-xl font-extrabold capitalize">{fechaVisible(fechaActual)}</h3><p className="mt-1 text-xs text-[#6B7570]">{fechaCorta(fechaActual)}</p></div></div><div className="mt-5 space-y-4">{servicios.map(servicio=>{const k=key(fechaActual,servicio);const opciones=filasDia.filter(row=>row.servicio===servicio);return <article key={servicio} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-lg font-extrabold">{servicio}</h4>{!esAlem&&<button onClick={()=>noConsumir(servicio)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${decisiones[k]==='no'?'border-[#D4AF37] bg-[#D4AF37]/15':'border-[#A6B0AA]/50'}`}>No consumiré</button>}</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{opciones.map((row,index)=>{const active=elecciones[k]?.plato===row.plato;return <button key={`${row.tipo_opcion}-${row.plato}-${index}`} onClick={()=>elegir(row)} className={`rounded-xl border p-3 text-left ${active?'border-[#1DB954] bg-[#1DB954]/10':'border-[#A6B0AA]/35 bg-[#FFFDF8]'}`}><span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7570]">{row.tipo_opcion||'Opción'}</span><strong className="mt-1 block text-sm leading-5">{row.plato}</strong></button>;})}</div></article>;})}</div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={()=>diaIndex>0?setDiaIndex(i=>i-1):setEtapa('fechas')} className="min-h-12 rounded-xl border bg-white px-5 font-bold">← Volver</button><button onClick={continuarDia} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold">{diaIndex<fechas.length-1?'Guardar y siguiente día →':'Revisar reserva →'}</button></div></div>}

        {etapa==='revision'&&<div><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 3</p><h3 className="text-xl font-extrabold">Revisa y confirma</h3><div className="mt-5 space-y-3">{fechas.map(fecha=><div key={fecha} className="rounded-2xl border bg-white p-4"><h4 className="font-extrabold capitalize">{fechaVisible(fecha)} <span className="text-xs font-normal text-[#6B7570]">· {fechaCorta(fecha)}</span></h4><div className="mt-2 space-y-2">{listaElecciones.filter(e=>e.fecha===fecha).map(e=><div key={`${e.fecha}-${e.servicio}`} className="flex justify-between gap-4 text-sm"><b>{e.servicio}</b><span className="text-right text-[#6B7570]">{e.plato}</span></div>)}</div></div>)}</div>{!esAlem&&!esCoordinador&&<label className="mt-5 block text-sm font-bold">Método de pago<select value={metodoPago} onChange={e=>setMetodoPago(e.target.value as typeof metodoPago)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 font-normal"><option>Transferencia bancaria</option><option>Débito en la instalación</option></select></label>}{esAlem&&<p className="mt-5 rounded-xl bg-[#1DB954]/10 p-4 text-sm">Consumo interno ALEMSI: no genera cobro ni comprobante.</p>}{esCoordinador&&<p className="mt-5 rounded-xl bg-[#D4AF37]/10 p-4 text-sm">Coordinadores: consumo valorizado para control, sin cobro al comensal.</p>}{!esAlem&&<label className="mt-5 flex cursor-pointer gap-3 rounded-xl border bg-[#FFFDF8] p-4 text-sm"><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#1DB954]"/><span>Confirmo que revisé las fechas, servicios y platos.</span></label>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={()=>{setDiaIndex(fechas.length-1);setEtapa('dia');}} className="min-h-12 rounded-xl border bg-white px-5 font-bold">← Editar</button><button disabled={pending} onClick={confirmar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold disabled:opacity-50">{pending?'Registrando…':'Confirmar reserva'}</button></div></div>}

        {etapa==='resultado'&&resultado?.ok&&<div className="mx-auto max-w-2xl text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1DB954] text-2xl font-black">✓</div><p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[#1DB954]">Reserva confirmada</p><h3 className="mt-1 text-3xl font-black">{resultado.result.codigoReserva}</h3><p className="mt-2 text-sm text-[#6B7570]">Referencia: {resultado.result.referencia}</p>{resultado.result.total>0&&<p className="mt-4 text-xl font-extrabold">Total: {money(resultado.result.total)}</p>}{resultado.result.pagoToken&&<div className="mt-6 flex flex-col items-center gap-3"><a href="/mis-reservas" className="inline-flex min-h-12 items-center rounded-xl bg-[#0E2A23] px-6 font-extrabold text-white">Gestionar en Mis reservas</a><a href={`/comprobante/${encodeURIComponent(resultado.result.pagoToken)}`} className="text-sm font-bold underline">Acceso directo opcional al comprobante</a></div>}</div>}
        {error&&<div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
      </div>
    </section>
    <p className="mt-5 text-center text-xs text-[#6B7570]">ALEMSI · Servicios de Higiene y Desinfección</p>
  </div>;
}
