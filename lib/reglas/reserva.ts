import { epochHoraChile, fechaIsoChile, ZONA_CHILE } from '../fecha-hora.ts';

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
  modalidad_cierre?: 'DIA_COMPLETO'|'HORAS_EXACTAS';
  anticipacion_oficina_horas?: number;
  anticipacion_paso_horas?: number;
  anticipacion_otros_horas?: number;
  ventana_maxima_dias?: number;
};

/**
 * Compatibilidad: las columnas históricas `anticipacion_*_horas` se conservan
 * hasta la migración final. En modalidad DIA_COMPLETO se interpretan como
 * HORA DE CORTE Chile para el día siguiente: general 12:00 y ALEMSI
 * Administrativos 16:00. El motor central evita que calendario y servidor
 * apliquen reglas distintas.
 */
export const REGLAS_RESERVA_DEFAULT: ReglasReserva = {
  anticipacion_reserva_horas: 12,
  cancelacion_directa_horas: 24,
  max_dias_consecutivos: 7,
  excepciones_habilitadas: 1,
  modalidad_cierre:'DIA_COMPLETO',
  anticipacion_oficina_horas:16,
  anticipacion_paso_horas:12,
  anticipacion_otros_horas:12,
  ventana_maxima_dias:31,
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

function fechaHoraServicioEpoch(fechaIso: string, servicio: string, timeZone = 'America/Santiago'): number {
  const hora = HORAS_SERVICIO[servicio] ?? 12;
  if(timeZone!==ZONA_CHILE) throw new Error(`Zona operacional no soportada: ${timeZone}`);
  return epochHoraChile(fechaIso,hora);
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

function fechaAnteriorIso(fechaIso:string):string{
  const [y,m,d]=String(fechaIso).split('-').map(Number);
  if(!y||!m||!d) throw new Error(`Fecha de reserva inválida: ${fechaIso}`);
  const anterior=new Date(Date.UTC(y,m-1,d-1,12));
  return anterior.toISOString().slice(0,10);
}

function horaCorteNormalizada(valor:number|undefined,fallback:number):number{
  const n=Number(valor);
  if(!Number.isFinite(n)||n<0||n>23) return fallback;
  return Math.trunc(n);
}

export function horaCorteReservaParaInstitucion(reglas:ReglasReserva,institucion:string):number{
  const tipo=tipoInstitucion(institucion);
  if(tipo==='administrativos') return horaCorteNormalizada(reglas.anticipacion_oficina_horas,16);
  return horaCorteNormalizada(reglas.anticipacion_otros_horas ?? reglas.anticipacion_reserva_horas,12);
}

export type EvaluacionCorteReserva={
  habilitada:boolean;
  horaCorte:number;
  fechaCorte:string;
  corteEpoch:number;
  motivo:'ANTES_DEL_CORTE'|'CORTE_VENCIDO';
};

export function evaluarCorteReserva(
  fechaIso:string,
  institucion:string,
  reglas:ReglasReserva,
  ahora=new Date(),
  timeZone='America/Santiago',
):EvaluacionCorteReserva{
  if(timeZone!==ZONA_CHILE) throw new Error(`Zona operacional no soportada: ${timeZone}`);
  const horaCorte=horaCorteReservaParaInstitucion(reglas,institucion);
  const fechaCorte=fechaAnteriorIso(fechaIso);
  const corteEpoch=epochHoraChile(fechaCorte,horaCorte);
  const habilitada=ahora.getTime()<corteEpoch;
  return {habilitada,horaCorte,fechaCorte,corteEpoch,motivo:habilitada?'ANTES_DEL_CORTE':'CORTE_VENCIDO'};
}

export function reservaInstitucionHabilitada(
  fechaIso:string,
  institucion:string,
  reglas:ReglasReserva,
  ahora=new Date(),
  timeZone='America/Santiago',
):boolean{
  return evaluarCorteReserva(fechaIso,institucion,reglas,ahora,timeZone).habilitada;
}

// Funciones históricas conservadas para compatibilidad con rutas no migradas.
export function reservaComercialHabilitada(
  fechaIso: string,
  _servicio: string,
  anticipacionHoras: number,
  ahora = new Date(),
  timeZone = 'America/Santiago',
  modalidad:'DIA_COMPLETO'|'HORAS_EXACTAS'='DIA_COMPLETO',
): boolean {
  if(timeZone!==ZONA_CHILE) throw new Error(`Zona operacional no soportada: ${timeZone}`);
  if(modalidad==='HORAS_EXACTAS') return ahora.getTime()<fechaHoraServicioEpoch(fechaIso,_servicio,timeZone)-Math.max(0,Number(anticipacionHoras||0))*3_600_000;
  const hora=horaCorteNormalizada(anticipacionHoras,12);
  return ahora.getTime()<epochHoraChile(fechaAnteriorIso(fechaIso),hora);
}

export function reservaPasoHabilitada(
  fechaIso:string,
  anticipacionHoras:number,
  ahora=new Date(),
  timeZone='America/Santiago',
):boolean {
  if(timeZone!==ZONA_CHILE) throw new Error(`Zona operacional no soportada: ${timeZone}`);
  const hora=horaCorteNormalizada(anticipacionHoras,12);
  return ahora.getTime()<epochHoraChile(fechaAnteriorIso(fechaIso),hora);
}

export function anticipacionParaInstitucion(reglas:ReglasReserva,institucion:string):number{
  return horaCorteReservaParaInstitucion(reglas,institucion);
}

export function fechaDentroVentanaMaxima(fechaIso:string,maxDias:number,ahora=new Date()):boolean{
  const hoy=fechaIsoChile(ahora);
  const epoch=(iso:string)=>{const [y,m,d]=iso.split('-').map(Number);return Date.UTC(y,m-1,d,12)};
  const dias=(epoch(fechaIso)-epoch(hoy))/86_400_000;
  return dias>=0&&dias<=Math.max(1,Math.trunc(Number(maxDias)||31));
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

export function diasCorridosDelPeriodo(fechas: string[]): number {
  const ordenadas = [...new Set(fechas)].sort();
  if (!ordenadas.length) return 0;
  const epoch = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) throw new Error(`Fecha de reserva inválida: ${iso}`);
    return Date.UTC(y, m - 1, d, 12);
  };
  return Math.floor((epoch(ordenadas.at(-1)!) - epoch(ordenadas[0])) / 86_400_000) + 1;
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
