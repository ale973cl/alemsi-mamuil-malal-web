'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { crearComensal, listarInstitucionesActivas, obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { notificarReservaConfirmadaDinamica } from '@/lib/email/reserva-confirmacion';
import { obtenerMinutasRango } from '@/lib/db/minutas';
import { crearOActualizarReserva, obtenerDeudaBloqueante, obtenerReglasReserva } from '@/lib/db/reservas';
import { setComensalSession } from '@/lib/auth/comensal-session';
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
  await setComensalSession(rut);
  const institucion = persona.institucion?.trim() || 'Visitas';
  const precio = await obtenerPrecioPersona(rut, institucion);
  const tipo = tipoInstitucion(institucion);
  const deudas = tipo === 'comercial' ? await obtenerDeudaBloqueante(rut) : [];
  return { ok: true as const, persona: { ...persona, rutVisible: normalizarRutVisible(rut), institucion }, precio, deudas };
}

const correoValido=(valor:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
const telefonoValido=(valor:string)=>/^\+?56\s?9\s?\d{4}\s?\d{4}$/.test(valor.replace(/[()-]/g,' ').replace(/\s+/g,' ').trim())||/^9\d{8}$/.test(valor.replace(/\D/g,''));
const nombreCompletoValido=(valor:string)=>valor.trim().split(/\s+/).filter(parte=>/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(parte)).length>=2;
const correosCopiaReserva=()=>[...new Set(String(process.env.RESERVA_EMAIL_CC||'').split(/[;,]/).map(v=>v.trim().toLowerCase()).filter(correoValido))].slice(0,2);

export async function registrarNuevoComensal(input:{rut:string;nombre:string;telefono:string;correo:string;institucion:string}) {
  try {
    if(!validarRutM11(input.rut)) return {ok:false as const,error:'RUT inválido.'};
    if(!input.nombre.trim()||!input.institucion.trim()) return {ok:false as const,error:'Completa nombre e institución.'};
    if(!nombreCompletoValido(input.nombre)) return {ok:false as const,error:'Ingresa nombre y apellido, por ejemplo: Juan Pérez.'};
    if(!correoValido(input.correo.trim())) return {ok:false as const,error:'Correo inválido.'};
    if(!telefonoValido(input.telefono)) return {ok:false as const,error:'Ingresa un móvil chileno válido.'};
    const instituciones=await listarInstitucionesActivas();
    if(!instituciones.includes(input.institucion.trim())) return {ok:false as const,error:'Selecciona una institución válida.'};
    await crearComensal({...input,nombre:input.nombre.trim().replace(/\s+/g,' ')});
    const perfil=await identificarComensal(input.rut);
    if(!perfil.ok) return {ok:false as const,error:'No fue posible cargar la ficha registrada.'};
    return perfil;
  } catch(error) { return {ok:false as const,error:error instanceof Error?error.message:'No fue posible registrar el comensal.'}; }
}

export async function cargarMinutaDisponible(rutInput: string, inicio: string, fin: string) {
  const perfil = await identificarComensal(rutInput);
  if (!perfil.ok) return perfil;
  const reglas = await obtenerReglasReserva();
  const rows = await obtenerMinutasRango(inicio, fin);
  const tipo = tipoInstitucion(perfil.persona.institucion);
  const filtradas = rows.filter((row) => {
    if (tipo === 'administrativos' && row.servicio !== 'Almuerzo') return false;
    if (tipo === 'paso') { const tipoOpcion = String(row.tipo_opcion ?? '').trim().toUpperCase(); if (!['OPCION 1', 'HIPOCALORICO'].includes(tipoOpcion)) return false; }
    if (tipo === 'comercial' && !reservaComercialHabilitada(row.fecha, row.servicio, Number(reglas.anticipacion_reserva_horas))) return false;
    return true;
  });
  return { ok: true as const, rows: filtradas, reglas };
}

export async function confirmarReserva(input: { rut: string; elecciones: EleccionReserva[]; metodoPago?: 'Transferencia bancaria' | 'Débito en la instalación'; }) {
  try {
    const result = await crearOActualizarReserva(input);
    const persona = await obtenerComensal(input.rut);
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';

    if (result.correo && host) {
      const mensaje = {
        correo: result.correo,
        cc: correosCopiaReserva(),
        nombre: persona?.nombre || '',
        codigo: result.codigoReserva,
        referencia: result.codigoReserva,
        pagoToken: result.pagoToken,
        origin: `${proto}://${host}`,
        rut: normalizarRutVisible(input.rut),
        total: result.total,
        method: input.metodoPago || (result.esAlem ? 'Interno ALEMSI' : result.esCoordinador ? 'Costo asumido · Coordinadores' : 'Transferencia bancaria'),
        choices: input.elecciones,
      };
      after(async () => {
        console.info('RESERVA_SMTP_START');
        try {
          const correo = await notificarReservaConfirmadaDinamica(mensaje);
          if (correo.ok) console.info('RESERVA_SMTP_OK');
          else console.error('RESERVA_SMTP_ERROR', correo.errorType);
        } catch {
          console.error('RESERVA_SMTP_ERROR', 'protocol');
        }
      });
    } else {
      console.error('RESERVA_SMTP_ERROR', 'configuration');
    }

    return { ok: true as const, result: { ...result, correo: { ok: true as const, deferred: true as const } } };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'No fue posible registrar la reserva.' };
  }
}
