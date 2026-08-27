export const HORAS_SERVICIO: Record<string, number> = {
  Desayuno: 8,
  Almuerzo: 13,
  Once: 17,
  Cena: 20,
};

export type ReglasReserva = {
  anticipacion_reserva_horas: number;
  cancelacion_directa_horas: number;
  max_dias_consecutivos: number;
  excepciones_habilitadas: number;
};

export const REGLAS_RESERVA_DEFAULT: ReglasReserva = {
  anticipacion_reserva_horas: 48,
  cancelacion_directa_horas: 24,
  max_dias_consecutivos: 7,
  excepciones_habilitadas: 1,
};

export const ESTADO_MINUTA_PUBLICADA = 'PUBLICADA' as const;

export function minutaReservable(estado: string | null | undefined): boolean {
  return estado === ESTADO_MINUTA_PUBLICADA;
}

export function limpiarRut(rut: string): string {
  return String(rut ?? '').replace(/[^0-9Kk]/g, '').toUpperCase();
}

export function normalizarRutDb(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function normalizarRutVisible(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${dv}`;
}

export function validarRutM11(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d{1,8}$/.test(cuerpo)) return false;
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const calculado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return calculado === dv;
}

export function tipoInstitucion(institucion: string): 'paso' | 'administrativos' | 'coordinadores' | 'comercial' {
  const valor = String(institucion ?? '').trim().toLocaleLowerCase('es-CL');
  if (valor === 'alemsi' || valor === 'alemsi paso fronterizo') return 'paso';
  if (valor === 'alemsi administrativos') return 'administrativos';
  if (valor === 'coordinadores') return 'coordinadores';
  return 'comercial';
}

function zonedEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  timeZone = 'America/Santiago',
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  for (let i = 0; i < 2; i += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    guess += targetAsUtc - renderedAsUtc;
  }
  return guess;
}

function fechaHoraServicioEpoch(fechaIso: string, servicio: string, timeZone = 'America/Santiago'): number {
  const hora = HORAS_SERVICIO[servicio] ?? 12;
  const [year, month, day] = fechaIso.split('-').map(Number);
  return zonedEpoch(year, month, day, hora, 0, timeZone);
}

function finDiaCorteReservaEpoch(
  fechaIso: string,
  anticipacionHoras: number,
  timeZone = 'America/Santiago',
): number {
  const diasAnticipacion = Math.max(0, Math.ceil(Number(anticipacionHoras || 0) / 24));
  const [year, month, day] = fechaIso.split('-').map(Number);
  const fechaCorteUtc = new Date(Date.UTC(year, month - 1, day));
  fechaCorteUtc.setUTCDate(fechaCorteUtc.getUTCDate() - diasAnticipacion);
  return zonedEpoch(
    fechaCorteUtc.getUTCFullYear(),
    fechaCorteUtc.getUTCMonth() + 1,
    fechaCorteUtc.getUTCDate(),
    23,
    59,
    timeZone,
  ) + 59_999;
}

export function servicioYaOcurrio(
  fechaIso:string,
  servicio:string,
  ahora=new Date(),
  timeZone='America/Santiago',
):boolean {
  return ahora.getTime()>=fechaHoraServicioEpoch(fechaIso,servicio,timeZone);
}

export type LineaDeuda={referencia_reserva:string;fecha:string;servicio:string;monto_pendiente:number;estado:string};
export type DeudaBloqueante={referencia_reserva:string;primera_fecha:string;ultima_fecha:string;monto_pendiente:number;estados:string};

export function consolidarDeudaPasada(lineas:LineaDeuda[],ahora=new Date()):DeudaBloqueante[]{
  const agrupadas=new Map<string,{fechas:string[];monto:number;estados:Set<string>}>();
  for(const linea of lineas){
    if(!servicioYaOcurrio(String(linea.fecha),String(linea.servicio),ahora)) continue;
    const actual=agrupadas.get(linea.referencia_reserva)||{fechas:[],monto:0,estados:new Set<string>()};
    actual.fechas.push(String(linea.fecha));
    actual.monto+=Number(linea.monto_pendiente||0);
    actual.estados.add(String(linea.estado||'Pendiente'));
    agrupadas.set(linea.referencia_reserva,actual);
  }
  return [...agrupadas.entries()].map(([referencia_reserva,deuda])=>({
    referencia_reserva,
    primera_fecha:[...deuda.fechas].sort()[0],
    ultima_fecha:[...deuda.fechas].sort().at(-1)!,
    monto_pendiente:deuda.monto,
    estados:[...deuda.estados].join(', '),
  })).sort((a,b)=>a.primera_fecha.localeCompare(b.primera_fecha)||a.referencia_reserva.localeCompare(b.referencia_reserva));
}

export function reservaComercialHabilitada(
  fechaIso: string,
  _servicio: string,
  anticipacionHoras: number,
  ahora = new Date(),
  timeZone = 'America/Santiago',
): boolean {
  return ahora.getTime() <= finDiaCorteReservaEpoch(fechaIso, anticipacionHoras, timeZone);
}

export function cancelacionDirectaHabilitada(
  fechaIso: string,
  servicio: string,
  cancelacionHoras: number,
  ahora = new Date(),
  timeZone = 'America/Santiago',
): boolean {
  return ahora.getTime() <= fechaHoraServicioEpoch(fechaIso, servicio, timeZone) - cancelacionHoras * 3_600_000;
}

export function maxConsecutivosFechas(fechas: string[]): number {
  const ordenadas = [...new Set(fechas)].sort();
  if (!ordenadas.length) return 0;
  let mejor = 1;
  let actual = 1;
  for (let i = 1; i < ordenadas.length; i += 1) {
    const anterior = new Date(`${ordenadas[i - 1]}T12:00:00Z`).getTime();
    const presente = new Date(`${ordenadas[i]}T12:00:00Z`).getTime();
    actual = presente - anterior === 86_400_000 ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

export type EleccionReserva = {
  fecha: string;
  servicio: string;
  plato: string;
  tipo_opcion?: string;
};

export function validarEleccionesPorDia(
  fechas: string[],
  elecciones: EleccionReserva[],
  institucion: string,
): void {
  const tipo = tipoInstitucion(institucion);
  const porFecha = new Map<string, EleccionReserva[]>();
  for (const fecha of fechas) porFecha.set(fecha, []);
  for (const item of elecciones) porFecha.set(item.fecha, [...(porFecha.get(item.fecha) ?? []), item]);

  for (const fecha of fechas) {
    if ((porFecha.get(fecha) ?? []).length === 0) {
      if (tipo === 'paso' || tipo === 'administrativos') {
        throw new Error('Selecciona al menos una ración para cada día. Sin selección no se genera producción.');
      }
      throw new Error('Si seleccionas un día debes reservar al menos un plato.');
    }
  }
}

export function distribuirPrecioDia(precioDia: number, lineas: number): number[] {
  const cantidad = Math.max(1, Math.trunc(lineas));
  const base = Math.floor(Math.trunc(precioDia) / cantidad);
  const resto = Math.trunc(precioDia) % cantidad;
  return Array.from({ length: cantidad }, (_, indice) => base + (indice < resto ? 1 : 0));
}

export function formatoClp(valor: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
}
