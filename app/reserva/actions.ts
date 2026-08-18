'use server';

import { obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { obtenerMinutasRango } from '@/lib/db/minutas';
import { crearOActualizarReserva, obtenerDeudaBloqueante, obtenerReglasReserva } from '@/lib/db/reservas';
import {
  normalizarRutDb,
  normalizarRutVisible,
  reservaComercialHabilitada,
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
  const rows = await obtenerMinutasRango(inicio, fin);
  const tipo = tipoInstitucion(perfil.persona.institucion);

  const filtradas = rows.filter((row) => {
    if (tipo === 'administrativos' && row.servicio !== 'Almuerzo') return false;
    if (tipo === 'paso') {
      const tipoOpcion = String(row.tipo_opcion ?? '').trim().toUpperCase();
      if (!['OPCION 1', 'HIPOCALORICO'].includes(tipoOpcion)) return false;
    }
    if (tipo === 'comercial' && !reservaComercialHabilitada(row.fecha, row.servicio, Number(reglas.anticipacion_reserva_horas))) {
      return false;
    }
    return true;
  });

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
