'use client';

import { useMemo, useState, useTransition } from 'react';
import { cargarMinutaDisponible, confirmarReserva, identificarComensal } from '@/app/reserva/actions';
import type { EleccionReserva } from '@/lib/reglas/reserva';

type Perfil = Awaited<ReturnType<typeof identificarComensal>>;
type Minuta = Awaited<ReturnType<typeof cargarMinutaDisponible>>;

type Etapa = 'rut' | 'fechas' | 'dia' | 'revision' | 'resultado';

const ordenarServicios = ['Desayuno', 'Almuerzo', 'Once', 'Cena'];

function isoHoy() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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

export default function ReservaWizard() {
  const [rut, setRut] = useState('');
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

  function resetError() { setError(''); }

  function identificar() {
    resetError();
    startTransition(async () => {
      const response = await identificarComensal(rut);
      if (!response.ok) return setError(response.error);
      setPerfil(response);
      if (response.deudas.length) {
        setEtapa('fechas');
        return;
      }
      const { first, last } = mesActual();
      const menu = await cargarMinutaDisponible(response.persona.rut, first, last);
      if (!menu.ok) return setError(menu.error);
      setMinuta(menu);
      setEtapa('fechas');
    });
  }

  function toggleFecha(fecha: string) {
    setFechas((current) => current.includes(fecha) ? current.filter((x) => x !== fecha) : [...current, fecha].sort());
  }

  function key(fecha: string, servicio: string) { return `${fecha}|${servicio}`; }

  function elegir(row: (typeof rows)[number]) {
    if (!fechaActual) return;
    const k = key(fechaActual, row.servicio);
    setDecisiones((current) => ({ ...current, [k]: 'si' }));
    setElecciones((current) => ({
      ...current,
      [k]: { fecha: fechaActual, servicio: row.servicio, plato: row.plato, tipo_opcion: row.tipo_opcion ?? undefined },
    }));
  }

  function noConsumir(servicio: string) {
    if (!fechaActual) return;
    const k = key(fechaActual, servicio);
    setDecisiones((current) => ({ ...current, [k]: 'no' }));
    setElecciones((current) => {
      const next = { ...current };
      delete next[k];
      return next;
    });
  }

  function continuarFechas() {
    if (!fechas.length) return setError('Selecciona al menos una fecha.');
    setError('');
    setDiaIndex(0);
    setEtapa('dia');
  }

  function continuarDia() {
    const sinDecision = !esAlem ? servicios.filter((s) => !decisiones[key(fechaActual, s)]) : [];
    const seleccionadas = servicios.filter((s) => elecciones[key(fechaActual, s)]);
    if (sinDecision.length) return setError(`Debes indicar Consumiré o No consumiré en: ${sinDecision.join(', ')}.`);
    if (!seleccionadas.length) {
      return setError(esAlem ? 'Selecciona al menos una ración para este día. Sin selección no se genera producción.' : 'Si seleccionas este día debes reservar al menos un plato.');
    }
    setError('');
    if (diaIndex < fechas.length - 1) setDiaIndex((i) => i + 1);
    else setEtapa('revision');
  }

  const listaElecciones = Object.values(elecciones).filter((item) => fechas.includes(item.fecha));

  function confirmar() {
    if (!esAlem && !confirmado) return setError('Confirma que revisaste fechas, servicios y platos.');
    setError('');
    startTransition(async () => {
      const response = await confirmarReserva({ rut: perfil!.persona.rut, elecciones: listaElecciones, metodoPago });
      if (!response.ok) return setError(response.error);
      setResultado(response);
      setEtapa('resultado');
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-3xl border border-[#A6B0AA]/35 bg-[#FFFDF8] shadow-[0_18px_60px_rgba(14,42,35,0.08)]">
        <div className="border-b border-[#A6B0AA]/25 bg-[#0E2A23] px-5 py-5 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">Comensal</p>
          <h2 className="mt-1 text-2xl font-extrabold">Reserva de alimentación</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">Mismo circuito operativo de ALEMSI: identificación, minuta publicada, selección por día y confirmación transaccional.</p>
        </div>

        <div className="p-5 sm:p-8">
          {etapa === 'rut' && (
            <div className="mx-auto max-w-xl">
              <label className="block text-sm font-bold text-[#0E2A23]">RUT del comensal</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && identificar()}
                  placeholder="12.345.678-5"
                  autoComplete="off"
                  className="min-h-12 flex-1 rounded-xl border border-[#A6B0AA]/70 bg-white px-4 text-base text-[#071814] shadow-sm"
                />
                <button disabled={pending || !rut.trim()} onClick={identificar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? 'Consultando…' : 'Continuar'}
                </button>
              </div>
              <p className="mt-3 text-sm text-[#6B7570]">El RUT se valida y consulta únicamente en el servidor.</p>
            </div>
          )}

          {perfil && etapa !== 'rut' && (
            <div className="mb-6 grid gap-3 rounded-2xl border border-[#1DB954]/25 bg-[#1DB954]/5 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7570]">Comensal identificado</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#0E2A23]">{perfil.persona.nombre}</h3>
                <p className="text-sm text-[#6B7570]">{perfil.persona.rutVisible} · {perfil.persona.institucion}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold text-[#6B7570]">{perfil.precio.glosa}</p>
                <p className="text-lg font-extrabold text-[#0E2A23]">{esAlem ? 'Consumo interno' : money(perfil.precio.precio)}</p>
              </div>
            </div>
          )}

          {bloqueado && etapa === 'fechas' && (
            <div className="rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-5">
              <h3 className="font-extrabold text-[#0E2A23]">Nueva reserva bloqueada por pago pendiente</h3>
              <p className="mt-1 text-sm text-[#6B7570]">El bloqueo se libera cuando Finanzas deja el pago como Pagado.</p>
              <div className="mt-4 space-y-2">
                {deudas.map((d) => (
                  <div key={d.referencia_reserva} className="rounded-xl bg-white p-3 text-sm">
                    <b>{d.referencia_reserva}</b> · {money(Number(d.monto_pendiente))} · {d.estados}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!bloqueado && etapa === 'fechas' && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 1</p>
                  <h3 className="text-xl font-extrabold text-[#0E2A23]">Selecciona las fechas</h3>
                </div>
                <p className="text-sm text-[#6B7570]">Solo aparecen días con minuta publicada y servicio habilitado.</p>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-10">
                {fechasDisponibles.map((fecha) => {
                  const active = fechas.includes(fecha);
                  return (
                    <button key={fecha} onClick={() => toggleFecha(fecha)} className={`min-h-16 rounded-xl border p-2 text-center transition ${active ? 'border-[#1DB954] bg-[#1DB954] text-[#071814]' : 'border-[#A6B0AA]/55 bg-white text-[#0E2A23] hover:border-[#1DB954]'}`}>
                      <span className="block text-[10px] font-bold uppercase opacity-70">{new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short' })}</span>
                      <strong className="text-lg">{fecha.slice(-2)}</strong>
                    </button>
                  );
                })}
              </div>
              {!fechasDisponibles.length && <p className="mt-5 rounded-xl bg-[#A6B0AA]/10 p-4 text-sm text-[#6B7570]">No hay fechas publicadas y habilitadas en el mes actual.</p>}
              <div className="mt-6 flex justify-end">
                <button onClick={continuarFechas} disabled={!fechas.length} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] disabled:opacity-40">Continuar con {fechas.length || 0} día(s)</button>
              </div>
            </div>
          )}

          {etapa === 'dia' && fechaActual && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 2 · Día {diaIndex + 1} de {fechas.length}</p>
                  <h3 className="text-xl font-extrabold capitalize text-[#0E2A23]">{fechaVisible(fechaActual)}</h3>
                </div>
                <div className="flex gap-1">{fechas.map((fecha, i) => <span key={fecha} className={`h-2 w-8 rounded-full ${i === diaIndex ? 'bg-[#1DB954]' : i < diaIndex ? 'bg-[#0E2A23]' : 'bg-[#A6B0AA]/40'}`} />)}</div>
              </div>

              <div className="mt-5 space-y-4">
                {servicios.map((servicio) => {
                  const k = key(fechaActual, servicio);
                  const opciones = filasDia.filter((row) => row.servicio === servicio);
                  return (
                    <article key={servicio} className="rounded-2xl border border-[#A6B0AA]/35 bg-white p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-lg font-extrabold text-[#0E2A23]">{servicio}</h4>
                        {!esAlem && <button onClick={() => noConsumir(servicio)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${decisiones[k] === 'no' ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#0E2A23]' : 'border-[#A6B0AA]/50 text-[#6B7570]'}`}>No consumiré</button>}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {opciones.map((row, index) => {
                          const active = elecciones[k]?.plato === row.plato;
                          return (
                            <button key={`${row.tipo_opcion}-${row.plato}-${index}`} onClick={() => elegir(row)} className={`rounded-xl border p-3 text-left transition ${active ? 'border-[#1DB954] bg-[#1DB954]/10' : 'border-[#A6B0AA]/35 bg-[#FFFDF8] hover:border-[#1DB954]/70'}`}>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7570]">{row.tipo_opcion || 'Opción'}</span>
                              <strong className="mt-1 block text-sm text-[#071814]">{row.plato}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button onClick={() => diaIndex > 0 ? setDiaIndex((i) => i - 1) : setEtapa('fechas')} className="min-h-12 rounded-xl border border-[#A6B0AA]/60 bg-white px-5 font-bold text-[#0E2A23]">← Volver</button>
                <button onClick={continuarDia} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814]">{diaIndex < fechas.length - 1 ? 'Guardar y siguiente día →' : 'Revisar reserva →'}</button>
              </div>
            </div>
          )}

          {etapa === 'revision' && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Paso 3</p>
              <h3 className="text-xl font-extrabold text-[#0E2A23]">Revisa y confirma</h3>
              <div className="mt-5 space-y-3">
                {fechas.map((fecha) => (
                  <div key={fecha} className="rounded-2xl border border-[#A6B0AA]/35 bg-white p-4">
                    <h4 className="font-extrabold capitalize text-[#0E2A23]">{fechaVisible(fecha)}</h4>
                    <div className="mt-2 space-y-2">{listaElecciones.filter((e) => e.fecha === fecha).map((e) => <div key={`${e.fecha}-${e.servicio}`} className="flex justify-between gap-4 text-sm"><b>{e.servicio}</b><span className="text-right text-[#6B7570]">{e.plato}</span></div>)}</div>
                  </div>
                ))}
              </div>

              {!esAlem && !esCoordinador && (
                <label className="mt-5 block text-sm font-bold text-[#0E2A23]">Método de pago
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as typeof metodoPago)} className="mt-2 min-h-12 w-full rounded-xl border border-[#A6B0AA]/60 bg-white px-4 font-normal">
                    <option>Transferencia bancaria</option>
                    <option>Débito en la instalación</option>
                  </select>
                </label>
              )}

              {esAlem && <p className="mt-5 rounded-xl bg-[#1DB954]/10 p-4 text-sm text-[#0E2A23]">Consumo interno ALEMSI: no genera cobro ni comprobante.</p>}
              {esCoordinador && <p className="mt-5 rounded-xl bg-[#D4AF37]/10 p-4 text-sm text-[#0E2A23]">Coordinadores: consumo valorizado para control, sin cobro al comensal.</p>}

              {!esAlem && (
                <label className="mt-5 flex cursor-pointer gap-3 rounded-xl border border-[#A6B0AA]/35 bg-[#FFFDF8] p-4 text-sm text-[#0E2A23]">
                  <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#1DB954]" />
                  <span>Confirmo que revisé las fechas, servicios y platos de la reserva.</span>
                </label>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button onClick={() => { setDiaIndex(fechas.length - 1); setEtapa('dia'); }} className="min-h-12 rounded-xl border border-[#A6B0AA]/60 bg-white px-5 font-bold text-[#0E2A23]">← Editar</button>
                <button disabled={pending} onClick={confirmar} className="min-h-12 rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] disabled:opacity-50">{pending ? 'Registrando…' : 'Confirmar reserva'}</button>
              </div>
            </div>
          )}

          {etapa === 'resultado' && resultado?.ok && (
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1DB954] text-2xl font-black text-[#071814]">✓</div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">Reserva confirmada</p>
              <h3 className="mt-1 text-3xl font-black text-[#0E2A23]">{resultado.result.codigoReserva}</h3>
              <p className="mt-2 text-sm text-[#6B7570]">Referencia: {resultado.result.referencia}</p>
              {resultado.result.total > 0 && <p className="mt-4 text-xl font-extrabold text-[#0E2A23]">Total: {money(resultado.result.total)}</p>}
              {resultado.result.pagoToken && (
                <a href={`/comprobante/${encodeURIComponent(resultado.result.pagoToken)}`} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#0E2A23] px-6 font-extrabold text-white hover:bg-[#071814]">Ir a comprobante</a>
              )}
            </div>
          )}

          {error && <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
        </div>
      </section>

      <p className="mt-5 text-center text-xs text-[#6B7570]">ALEMSI · Servicios de Higiene y Desinfección</p>
    </div>
  );
}
