import 'server-only';
import { obtenerPrecioPersona } from '@/lib/db/comensales';
import { crearOActualizarReserva, obtenerDeudaBloqueante, obtenerReglasReserva } from '@/lib/db/reservas';
import {
  HORAS_SERVICIO as SERVICE_HOURS,
  limpiarRut as cleanRut,
  normalizarRutDb as dbRut,
  normalizarRutVisible as displayRut,
  validarRutM11 as validRut,
  reservaComercialHabilitada as isWithinCutoff,
  maxConsecutivosFechas as maxConsecutive,
  type EleccionReserva,
} from '@/lib/reglas/reserva';

export { SERVICE_HOURS, cleanRut, dbRut, displayRut, validRut, isWithinCutoff, maxConsecutive };
export function serviceDate(fecha:string,servicio:string){const hour=SERVICE_HOURS[servicio]??12;return new Date(`${fecha}T${String(hour).padStart(2,'0')}:00:00-04:00`);}
export async function rules(){return obtenerReglasReserva();}
export async function personPrice(rut:string,institution:string){const r=await obtenerPrecioPersona(rut,institution);return {price:r.precio,label:r.glosa};}
export async function blockingDebt(rut:string){return obtenerDeudaBloqueante(rut);}
export type ReservationChoice=EleccionReserva;
export async function saveReservation(input:{rut:string;choices:ReservationChoice[];method?:string}){
  const result=await crearOActualizarReserva({rut:input.rut,elecciones:input.choices,metodoPago:input.method as 'Transferencia bancaria'|'Débito en la instalación'|undefined});
  return {reference:result.referencia,code:result.codigoReserva,total:result.total,paymentToken:result.pagoToken,isAlem:result.esAlem,coordinator:result.esCoordinador};
}
