'use server';

import { obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { obtenerMinutasRango } from '@/lib/db/minutas';
import { filtrarMinutaReservable } from '@/lib/reglas/calendario';
import { crearOActualizarReserva, obtenerDeudaBloqueante, obtenerReglasReserva } from '@/lib/db/reservas';
import {
  normalizarRutDb,
  normalizarRutVisible,
  fechaActualIso,
  tipoInstitucion,
  validarRutM11,
  type EleccionReserva,
} from '@/lib/reglas/reserva';

export async function identificarComensal(rutInput: string) {
  if (!validarRutM11(rutInput)) return { ok: false as const, error: 'RUT inválido.' };
  const rut = normalizarRutDb(rutInput);
  const persona = await obtenerComensal(rut);
  if (!persona) return { ok: false as const, error: 'El RUT no está registrado como comensal.' };
  const institucion = persona.institucion?.trim() || 'Visitas';
  const precio = await obtenerPrecioPersona(rut, institucion);
  const tipo = tipoInstitucion(institucion);
  const deudas = tipo === 'comercial' ? await obtenerDeudaBloqueante(rut) : [];
  return {
    ok: true as const,
    persona: { ...persona, rutVisible: normalizarRutVisible(rut), institucion },
    precio,
    deudas,
  };
}

export async function cargarMinutaDisponible(rutInput: string, inicio: string, fin: string) {
  const perfil = await identificarComensal(rutInput);
  if (!perfil.ok) return perfil;
  const reglas = await obtenerReglasReserva();
  const hoy=fechaActualIso();
  const max=new Date(`${hoy}T12:00:00Z`);max.setUTCDate(max.getUTCDate()+61);const limite=max.toISOString().slice(0,10);
  const desde=inicio<hoy?hoy:inicio; const hasta=fin>limite?limite:fin;
  if(desde>hasta) return {ok:true as const,rows:[],reglas};
  const rows = await obtenerMinutasRango(desde, hasta);
  const filtradas = filtrarMinutaReservable(rows,perfil.persona.institucion,reglas);

  return { ok: true as const, rows: filtradas, reglas };
}

export async function confirmarReserva(input: {
  rut: string;
  elecciones: EleccionReserva[];
  metodoPago?: 'Transferencia bancaria' | 'Débito en la instalación';
}) {
  try {
    const result = await crearOActualizarReserva(input);
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'No fue posible registrar la reserva.' };
  }
}
