'use client';

import { useMemo, useState } from 'react';
import { guardarMinutasAction } from '@/app/admin-casino/actions';
import {
  normalizarFilaMinuta,
  validarFilasMinuta,
  type FilaMinutaInput,
} from '@/lib/reglas/minutas';

const OPCIONES = ['OPCION 1', 'OPCION 2', 'HIPOCALORICO'] as const;
const SERVICIOS = ['Almuerzo', 'Cena'] as const;

type PdfTextItem = { str: string; transform: number[] };
type PosItem = { str: string; x: number; y: number };

function normalizarOpcion(value: string) {
  const v = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (v.includes('HIPOCALOR')) return 'HIPOCALORICO';
  if (v.includes('OPCION 2')) return 'OPCION 2';
  return 'OPCION 1';
}

function fechaChile() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
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
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
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
  if (required.some(name => !headers.includes(name))) {
    throw new Error('El CSV debe contener: fecha, servicio, opcion, plato.');
  }
  return lines.slice(1).map(line => {
    const values = csvLine(line);
    const get = (name: string) => values[headers.indexOf(name)] || '';
    return normalizarFilaMinuta({
      fecha: get('fecha'), servicio: get('servicio'), tipo_opcion: get('opcion'), plato: get('plato'),
    });
  });
}

function agruparY(items: PosItem[], tolerancia = 3) {
  const grupos: PosItem[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    let grupo = grupos.find(g => Math.abs(g[0].y - item.y) <= tolerancia);
    if (!grupo) { grupo = []; grupos.push(grupo); }
    grupo.push(item);
  }
  return grupos.map(g => g.sort((a, b) => a.x - b.x));
}

function monthFromName(name: string) {
  const numeric = name.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
  if (numeric) return Number(numeric[1]);
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const meses: [string, number][] = [
    ['ENERO',1],['FEB',2],['MAR',3],['ABR',4],['MAY',5],['JUN',6],
    ['JUL',7],['AGO',8],['SEPT',9],['OCT',10],['NOV',11],['DIC',12],
  ];
  return meses.find(([k]) => n.includes(k))?.[1] || new Date().getMonth() + 1;
}

function toIso(day: number, month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function parsePdf(file: File): Promise<FilaMinutaInput[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const salida: FilaMinutaInput[] = [];
  let fallbackMonth = monthFromName(file.name);
  let fallbackYear = Number(file.name.match(/20\d{2}/)?.[0] || new Date().getFullYear());

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const items = (content.items as unknown as PdfTextItem[])
      .filter(i => i.str?.trim())
      .map(i => ({ str: i.str.trim(), x: Number(i.transform?.[4] || 0), y: Number(i.transform?.[5] || 0) }));

    const all = items.map(i => i.str).join(' ');
    const yMatch = all.match(/20\d{2}/);
    if (yMatch) fallbackYear = Number(yMatch[0]);

    const headers = agruparY(items).map(line => {
      const direct = line.filter(i => /^\d{1,2}\/\d{1,2}$/.test(i.str));
      if (direct.length >= 2) {
        return {
          y: line.reduce((s, i) => s + i.y, 0) / line.length,
          cells: direct.map(i => {
            const [d, m] = i.str.split('/').map(Number);
            return { x: i.x, fecha: toIso(d, m, fallbackYear) };
          }),
        };
      }

      const nums = line.filter(i => /^\d{1,2}$/.test(i.str));
      const weekdays = line.filter(i => /^(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)$/i.test(i.str));
      if (nums.length >= 2 && weekdays.length >= 2) {
        let month = fallbackMonth;
        let prev = 0;
        const cells = nums.map(i => {
          const d = Number(i.str);
          if (prev && d < prev - 20) month++;
          if (month > 12) { month = 1; fallbackYear++; }
          prev = d;
          return { x: i.x, fecha: toIso(d, month, fallbackYear) };
        });
        fallbackMonth = month;
        return { y: line.reduce((s, i) => s + i.y, 0) / line.length, cells };
      }
      return null;
    }).filter(Boolean) as Array<{ y: number; cells: Array<{ x: number; fecha: string }> }>;

    headers.sort((a, b) => b.y - a.y);

    for (let h = 0; h < headers.length; h++) {
      const header = headers[h];
      const low = h + 1 < headers.length ? headers[h + 1].y + 4 : -Infinity;
      const opciones = items
        .filter(i => i.y < header.y - 2 && i.y > low && /^(opci[oó]n\s*[12]|hipocal[oó]rico)$/i.test(i.str))
        .sort((a, b) => b.y - a.y)
        .slice(0, 6);
      if (opciones.length < 3) continue;

      const xs = header.cells.map(c => c.x).sort((a, b) => a - b);
      const bounds = xs.map((x, idx) => ({
        left: idx === 0 ? x - (xs[1] - x) / 2 : (xs[idx - 1] + x) / 2,
        right: idx === xs.length - 1 ? x + (x - xs[idx - 1]) / 2 : (x + xs[idx + 1]) / 2,
      }));

      opciones.forEach((op, rowIndex) => {
        const top = rowIndex === 0 ? header.y - 3 : (opciones[rowIndex - 1].y + op.y) / 2;
        const bottom = rowIndex === opciones.length - 1 ? low : (op.y + opciones[rowIndex + 1].y) / 2;
        header.cells.forEach((cell, colIndex) => {
          const b = bounds[colIndex];
          const texto = items
            .filter(i => i.y < top && i.y > bottom && i.x >= b.left && i.x < b.right)
            .filter(i => !/^\d{1,2}(\/\d{1,2})?$/.test(i.str))
            .filter(i => !/^(opci[oó]n\s*[12]|hipocal[oó]rico|almuerzo|cena)$/i.test(i.str))
            .sort((a, b) => b.y - a.y || a.x - b.x)
            .map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
          if (texto) {
            salida.push(normalizarFilaMinuta({
              fecha: cell.fecha,
              servicio: rowIndex < 3 ? 'Almuerzo' : 'Cena',
              tipo_opcion: normalizarOpcion(op.str),
              plato: texto,
            }));
          }
        });
      });
    }
  }

  const uniq = new Map<string, FilaMinutaInput>();
  for (const row of salida) uniq.set(`${row.fecha}|${row.servicio}|${row.tipo_opcion}`, row);
  const rows = [...uniq.values()].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.servicio.localeCompare(b.servicio) || a.tipo_opcion.localeCompare(b.tipo_opcion));
  if (!rows.length) {
    throw new Error('No pude reconocer la matriz del PDF. Usa el formato ALEMSI con días en columnas y Opción 1 / Opción 2 / Hipocalórico.');
  }
  return rows;
}

export default function MinutaCarga({ platos }: { platos: Array<{ plato: string; tiene_receta: boolean }> }) {
  const hoy = fechaChile();
  const [rows, setRows] = useState<FilaMinutaInput[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(addDays(hoy, 6));

  const fechas = useMemo(() => [...new Set(rows.map(r => r.fecha))].sort(), [rows]);
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
    setRows(f.flatMap(fecha => SERVICIOS.flatMap(servicio =>
      OPCIONES.map(tipo_opcion => ({ fecha, servicio, tipo_opcion, plato: '' }))
    )));
    setMessage(`Matriz creada para ${f.length} día(s). Completa los platos y previsualiza antes de guardar.`);
  }

  async function csvChanged(file?: File) {
    if (!file) return;
    setMessage('');
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed);
      setMessage(`CSV leído: ${parsed.length} registros en previsualización.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CSV inválido.');
    }
  }

  async function pdfChanged(file?: File) {
    if (!file) return;
    setMessage('Leyendo PDF…'); setReading(true);
    try {
      const parsed = await parsePdf(file);
      setRows(parsed);
      const fs = [...new Set(parsed.map(r => r.fecha))].sort();
      if (fs.length) { setInicio(fs[0]); setFin(fs[fs.length - 1]); }
      setMessage(`PDF leído: ${parsed.length} registros detectados. Revisa y corrige la previsualización antes de guardar.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible leer el PDF.');
    } finally { setReading(false); }
  }

  async function save() {
    setMessage('');
    if (errors.length) { setMessage('Corrige los campos vacíos o inválidos antes de guardar.'); return; }
    setSaving(true);
    try {
      const result = await guardarMinutasAction(rows);
      if (result.ok) setMessage(`${result.cantidad} registros guardados como PUBLICABLE. Ya puedes enviarlos a Coordinación o publicarlos desde el período.`);
      else setMessage(result.errores.map(error => `Fila ${error.fila}: ${error.mensaje}`).join(' | '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar la minuta.');
    } finally { setSaving(false); }
  }

  const get = (fecha: string, servicio: string, opcion: string) =>
    rows.find(r => r.fecha === fecha && r.servicio === servicio && r.tipo_opcion === opcion)?.plato || '';

  return <div className="mt-4 rounded-2xl border bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-black">Cargar y previsualizar minuta</h3>
        <p className="mt-1 text-sm text-[#6B7570]">PDF ALEMSI, CSV o carga manual. Nada se publica antes de que revises la matriz.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">
          {reading ? 'Leyendo PDF…' : 'Cargar PDF'}
          <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={reading} onChange={e => pdfChanged(e.target.files?.[0])}/>
        </label>
        <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-bold">
          Cargar CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => csvChanged(e.target.files?.[0])}/>
        </label>
      </div>
    </div>

    <div className="mt-4 grid gap-3 rounded-xl bg-[#F6F3EA] p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm font-bold">Desde<input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"/></label>
      <label className="text-sm font-bold">Hasta<input type="date" value={fin} onChange={e => setFin(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"/></label>
      <button type="button" onClick={crearMatriz} className="self-end rounded-lg border bg-white px-4 py-2 font-black">Crear matriz manual</button>
    </div>

    <datalist id="platos-minuta">{platos.map(item => <option key={item.plato} value={item.plato}/>)}</datalist>

    {rows.length > 0 && <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h4 className="font-black">Previsualización editable</h4><p className="text-sm text-[#6B7570]">{fechas.length} día(s) · {rows.length} registros detectados</p></div>
        <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-xs font-black">PREVISUALIZACIÓN · NO PUBLICADA</span>
      </div>
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-max border-collapse text-xs">
          <thead><tr className="bg-[#EAF0F4]">
            <th className="sticky left-0 z-20 min-w-[110px] border p-2 text-left">Servicio</th>
            <th className="sticky left-[110px] z-20 min-w-[110px] border p-2 text-left">Opción</th>
            {fechas.map(fecha => <th key={fecha} className={`min-w-[190px] border p-2 text-center ${fecha === hoy ? 'bg-[#1DB954]/20' : ''}`}>
              <div className="font-black">{nombreFecha(fecha)}</div><div className="text-[10px] font-normal">{fecha}{fecha === hoy ? ' · HOY' : ''}</div>
            </th>)}
          </tr></thead>
          <tbody>
            {SERVICIOS.flatMap(servicio => OPCIONES.map((opcion, oi) => (
              <tr key={`${servicio}-${opcion}`}>
                <th className={`sticky left-0 z-10 border p-2 text-left font-black ${servicio === 'Almuerzo' ? 'bg-[#EAF7EF]' : 'bg-[#EDF3FA]'}`}>{oi === 0 ? servicio : ''}</th>
                <th className="sticky left-[110px] z-10 border bg-white p-2 text-left font-bold">{opcion}</th>
                {fechas.map(fecha => (
                  <td key={`${fecha}-${servicio}-${opcion}`} className={`border p-1 ${fecha === hoy ? 'bg-[#1DB954]/5' : ''}`}>
                    <textarea value={get(fecha, servicio, opcion)} onChange={e => patchCell(fecha, servicio, opcion, e.target.value)} rows={3} className="w-full min-w-[180px] resize-y rounded border p-2 text-xs" placeholder="Plato"/>
                  </td>
                ))}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>}

    {errors.length > 0 && rows.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay {errors.length} campo(s) por completar o corregir antes de guardar.</p>}
    {rows.some(row => { const item = platos.find(plato => plato.plato.toLocaleLowerCase('es-CL') === row.plato.trim().toLocaleLowerCase('es-CL')); return item && !item.tiene_receta; }) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Advertencia: uno o más platos no tienen receta activa; Producción podrá contar raciones, pero no calcular insumos teóricos.</p>}
    {message && <p className="mt-3 rounded-lg bg-[#F6F3EA] p-3 text-sm font-bold">{message}</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={save} disabled={saving || reading || !rows.length || errors.length > 0} className="rounded-lg bg-[#1DB954] px-5 py-2.5 font-black disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar previsualización como PUBLICABLE'}</button>
      {rows.length > 0 && <button type="button" onClick={() => setRows([])} className="rounded-lg border px-4 py-2 font-bold">Limpiar previsualización</button>}
    </div>
  </div>;
}
