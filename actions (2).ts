'use server';

import { cookies } from 'next/headers';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { formatFecha } from '@/lib/ui/format';
import { crearComensal, listarInstitucionesActivas, obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
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

async function guardarSesionComensal(rut:string){const jar=await cookies();jar.set('alemsi_comensal_rut',rut,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*4});}

export async function identificarComensal(rutInput: string) {
  if (!validarRutM11(rutInput)) return { ok: false as const, error: 'RUT inválido.' };
  const rut = normalizarRutDb(rutInput);
  const persona = await obtenerComensal(rut);
  if (!persona) return { ok: false as const, nuevo: true as const, rut, rutVisible: normalizarRutVisible(rut), instituciones: await listarInstitucionesActivas() };
  const institucion = persona.institucion?.trim() || 'Visitas';
  const precio = await obtenerPrecioPersona(rut, institucion);
  const tipo = tipoInstitucion(institucion);
  const deudas = tipo === 'comercial' ? await obtenerDeudaBloqueante(rut) : [];
  await guardarSesionComensal(rut);
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
    const persona=await obtenerComensal(input.rut);
    const correo=String(persona?.correo||'').trim();
    if(correo){
      console.info('RESERVA_SMTP_START',{reserva:result.codigoReserva});
      const servicios=input.elecciones.map(x=>`${formatFecha(x.fecha)} · ${x.servicio} · ${x.plato}`).join('\n');
      const delivery=await enviarCorreoSmtp({to:correo,subject:`ALEMSI · Reserva ${result.codigoReserva}`,text:[
        `Hola ${persona?.nombre||''},`,
        '',
        'Tu reserva fue registrada correctamente.',
        `N.º de reserva: ${result.codigoReserva}`,
        '',
        servicios,
        '',
        result.total>0?`Total: $${Number(result.total).toLocaleString('es-CL')}`:'Modalidad: consumo interno / costo asumido según corresponda.',
        '',
        'Puedes consultar o modificar tu reserva desde Mis reservas mientras la ventana operativa lo permita.',
        '',
        'Saludos cordiales,',
        'ALEMSI · Casino Mamuil Malal',
      ].join('\n')});
      if(delivery.ok) console.info('RESERVA_SMTP_OK'); else console.error('RESERVA_SMTP_ERROR',delivery.errorType);
    }
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'No fue posible registrar la reserva.' };
  }
}
