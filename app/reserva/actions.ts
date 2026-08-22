'use server';

import { headers } from 'next/headers';
import { crearComensal, listarInstitucionesActivas, obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { notificarReservaConfirmada } from '@/lib/email/notificaciones';
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
  if (!persona) return { ok: false as const, nuevo: true as const, rut, rutVisible: normalizarRutVisible(rut), instituciones: await listarInstitucionesActivas() };
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

const correoValido=(valor:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
const telefonoValido=(valor:string)=>/^\+?56\s?9\s?\d{4}\s?\d{4}$/.test(valor.replace(/[()-]/g,' ').replace(/\s+/g,' ').trim())||/^9\d{8}$/.test(valor.replace(/\D/g,''));

export async function registrarNuevoComensal(input:{rut:string;nombre:string;telefono:string;correo:string;institucion:string}) {
  try {
    if(!validarRutM11(input.rut)) return {ok:false as const,error:'RUT inválido.'};
    if(!input.nombre.trim()||!input.institucion.trim()) return {ok:false as const,error:'Completa nombre e institución.'};
    if(!correoValido(input.correo.trim())) return {ok:false as const,error:'Correo inválido.'};
    if(!telefonoValido(input.telefono)) return {ok:false as const,error:'Ingresa un móvil chileno válido.'};
    const instituciones=await listarInstitucionesActivas();
    if(!instituciones.includes(input.institucion.trim())) return {ok:false as const,error:'Selecciona una institución válida.'};
    await crearComensal(input);
    const perfil=await identificarComensal(input.rut);
    if(!perfil.ok) return {ok:false as const,error:'No fue posible cargar la ficha registrada.'};
    return perfil;
  } catch(error) {
    return {ok:false as const,error:error instanceof Error?error.message:'No fue posible registrar el comensal.'};
  }
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
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    const correo = result.correo && host
      ? await notificarReservaConfirmada({ correo: result.correo, codigo: result.codigoReserva, referencia: result.referencia, pagoToken: result.pagoToken, origin: `${proto}://${host}` })
      : null;
    return { ok: true as const, result: { ...result, correo } };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'No fue posible registrar la reserva.' };
  }
}
