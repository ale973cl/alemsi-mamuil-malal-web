'use client';

import { useMemo, useState } from 'react';
import { guardarMinutasAction } from '@/app/admin-casino/actions';
import { normalizarFilaMinuta, validarFilasMinuta, type FilaMinutaInput } from '@/lib/reglas/minutas';

const OPCIONES = ['OPCION 1', 'OPCION 2', 'HIPOCALORICO'] as const;
const SERVICIOS = ['Almuerzo', 'Cena'] as const;

function fechaChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function fechasEntre(inicio: string, fin: string) {
  const out: string[] = [];
  for (let f = inicio; f <= fin; f = addDays(f, 1)) {
    out.push(f);
    if (out.length > 62) break;
  }
  return out;
}

function nombreFecha(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function csvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value.trim()); value = '';
    } else value += char;
  }
  values.push(value.trim());
  return values;
}

function parseCsv(text: string): FilaMinutaInput[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const headers = csvLine(lines[0]).map(value => value.toLocaleLowerCase('es-CL'));
  const required = ['fecha', 'servicio', 'opcion', 'plato'];
  if (required.some(name => !headers.includes(name))) throw new Error('El CSV debe contener: fecha, servicio, opcion, plato.');
  return lines.slice(1).map(line => {
    const values = csvLine(line);
    const get = (name: string) => values[headers.indexOf(name)] || '';
    return normalizarFilaMinuta({ fecha: get('fecha'), servicio: get('servicio'), tipo_opcion: get('opcion'), plato: get('plato') });
  });
}

function dividirSemanas(fechas: string[]) {
  const semanas: string[][] = [];
  for (let i = 0; i < fechas.length; i += 7) semanas.push(fechas.slice(i, i + 7));
  return semanas;
}

export default function MinutaCarga({ platos }: { platos: Array<{ plato: string; tiene_receta: boolean }> }) {
  const hoy = fechaChile();
  const [rows, setRows] = useState<FilaMinutaInput[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(addDays(hoy, 6));
  const [semanaActiva, setSemanaActiva] = useState(0);

  const fechas = useMemo(() => [...new Set(rows.map(r => r.fecha))].sort(), [rows]);
  const semanas = useMemo(() => dividirSemanas(fechas), [fechas]);
  const semana = semanas[semanaActiva] ?? [];
  const errors = rows.length ? validarFilasMinuta(rows) : [];

  function patchCell(fecha: string, servicio: string, opcion: string, value: string) {
    setRows(current => {
      const idx = current.findIndex(r => r.fecha === fecha && r.servicio === servicio && r.tipo_opcion === opcion);
      if (idx >= 0) return current.map((r, i) => i === idx ? { ...r, plato: value } : r);
      return [...current, normalizarFilaMinuta({ fecha, servicio, tipo_opcion: opcion, plato: value })];
    });
  }

  function crearMatriz() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < inicio) {
      setMessage('Rango de fechas inválido.'); return;
    }
    const f = fechasEntre(inicio, fin);
    setRows(f.flatMap(fecha => SERVICIOS.flatMap(servicio => OPCIONES.map(tipo_opcion => ({ fecha, servicio, tipo_opcion, plato: '' })))));
    setSemanaActiva(0);
    setMessage(`Matriz creada para ${f.length} día(s). Completa los platos antes de guardar.`);
  }

  async function csvChanged(file?: File) {
    if (!file) return;
    setMessage('');
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed);
      const fs = [...new Set(parsed.map(r => r.fecha))].sort();
      if (fs.length) { setInicio(fs[0]); setFin(fs[fs.length - 1]); }
      setSemanaActiva(0);
      setMessage(`CSV leído: ${parsed.length} registros. Revisa la matriz antes de guardar.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CSV inválido.');
    }
  }

  async function save() {
    setMessage('');
    if (errors.length) { setMessage(`Hay ${errors.length} campo(s) por corregir. Revisa la matriz antes de guardar.`); return; }
    setSaving(true);
    try {
      const result = await guardarMinutasAction(rows);
      if (result.ok) setMessage(`${result.cantidad} registros guardados como PUBLICABLE. Ya puedes enviarlos a Coordinación o publicarlos.`);
      else setMessage(result.errores.map(error => `Fila ${error.fila}: ${error.mensaje}`).join(' | '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar la minuta.');
    } finally { setSaving(false); }
  }

  const get = (fecha: string, servicio: string, opcion: string) => rows.find(r => r.fecha === fecha && r.servicio === servicio && r.tipo_opcion === opcion)?.plato || '';
  const tieneError = (fecha: string, servicio: string, opcion: string) => {
    const row = rows.find(r => r.fecha === fecha && r.servicio === servicio && r.tipo_opcion === opcion);
    return !row || !row.plato.trim();
  };

  return <div className="mt-4 rounded-2xl border bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-black">Cargar y previsualizar minuta</h3>
        <p className="mt-1 text-sm text-[#6B7570]">CSV o carga manual. La presentación siempre queda como minuta semanal editable.</p>
      </div>
      <label className="cursor-pointer rounded-lg bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">
        Cargar CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => csvChanged(e.target.files?.[0])}/>
      </label>
    </div>

    <div className="mt-4 grid gap-3 rounded-xl bg-[#F6F3EA] p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm font-bold">Desde<input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"/></label>
      <label className="text-sm font-bold">Hasta<input type="date" value={fin} onChange={e => setFin(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"/></label>
      <button type="button" onClick={crearMatriz} className="self-end rounded-lg border bg-white px-4 py-2 font-black">Crear matriz manual</button>
    </div>

    <datalist id="platos-minuta">{platos.map(item => <option key={item.plato} value={item.plato}/>)}</datalist>

    {rows.length > 0 && <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-black">Previsualización editable</h4><p className="text-sm text-[#6B7570]">{fechas.length} día(s) · {rows.length} registros · {semanas.length} semana(s)</p></div>
        <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-xs font-black">PREVISUALIZACIÓN · NO PUBLICADA</span>
      </div>

      {semanas.length > 1 && <div className="mb-3 flex flex-wrap gap-2">{semanas.map((s, i) => <button key={i} type="button" onClick={() => setSemanaActiva(i)} className={`rounded-lg px-3 py-2 text-sm font-black ${semanaActiva === i ? 'bg-[#0E2A23] text-white' : 'border bg-white'}`}>Semana {i + 1}<span className="ml-1 text-[10px] opacity-70">{nombreFecha(s[0])}–{nombreFecha(s[s.length - 1])}</span></button>)}</div>}

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-max border-collapse text-xs">
          <thead><tr className="bg-[#EAF0F4]">
            <th className="sticky left-0 z-20 min-w-[90px] border p-2 text-left">Servicio</th>
            <th className="sticky left-[90px] z-20 min-w-[95px] border p-2 text-left">Opción</th>
            {semana.map(fecha => <th key={fecha} className={`min-w-[220px] border p-2 text-center ${fecha === hoy ? 'bg-[#1DB954]/20' : ''}`}><div className="font-black">{nombreFecha(fecha)}</div>{fecha === hoy && <div className="text-[10px] font-black text-[#0E2A23]">HOY</div>}</th>)}
          </tr></thead>
          <tbody>
            {SERVICIOS.flatMap(servicio => OPCIONES.map((opcion, oi) => <tr key={`${servicio}-${opcion}`}>
              <th className={`sticky left-0 z-10 border p-2 text-left font-black ${servicio === 'Almuerzo' ? 'bg-[#EAF7EF]' : 'bg-[#EDF3FA]'}`}>{oi === 0 ? servicio : ''}</th>
              <th className="sticky left-[90px] z-10 border bg-white p-2 text-left text-[10px] font-bold">{opcion}</th>
              {semana.map(fecha => <td key={`${fecha}-${servicio}-${opcion}`} className={`border p-1 ${fecha === hoy ? 'bg-[#1DB954]/5' : ''}`}>
                <textarea value={get(fecha, servicio, opcion)} onChange={e => patchCell(fecha, servicio, opcion, e.target.value)} rows={4} className={`w-full min-w-[210px] resize-y rounded border p-2 text-sm leading-5 ${tieneError(fecha, servicio, opcion) ? 'border-amber-400 bg-amber-50' : 'border-[#A6B0AA]/45 bg-white'}`} placeholder="Nombre del plato"/>
              </td>)}
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>}

    {errors.length > 0 && rows.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay {errors.length} campo(s) por completar o corregir. Las celdas vacías están destacadas.</p>}
    {rows.some(row => { const item = platos.find(plato => plato.plato.toLocaleLowerCase('es-CL') === row.plato.trim().toLocaleLowerCase('es-CL')); return item && !item.tiene_receta; }) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Advertencia: uno o más platos no tienen receta activa. Esto no impide publicar la minuta; solo limita el cálculo futuro de insumos.</p>}
    {message && <p className="mt-3 rounded-lg bg-[#F6F3EA] p-3 text-sm font-bold">{message}</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={save} disabled={saving || !rows.length || errors.length > 0} className="rounded-lg bg-[#1DB954] px-5 py-2.5 font-black disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar como PUBLICABLE'}</button>
      {rows.length > 0 && <button type="button" onClick={() => { setRows([]); setSemanaActiva(0); }} className="rounded-lg border px-4 py-2 font-bold">Limpiar previsualización</button>}
    </div>
  </div>;
}
