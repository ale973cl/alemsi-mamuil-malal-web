import 'server-only';
import { query } from '@/lib/db/pool';
import { normalizarRutDb } from '@/lib/reglas/reserva';

export async function listarValoresInstituciones(){
  return query<any>(`SELECT nombre,precio_dia,precio_especial,regla_activa,activa,descripcion,actualizado_por,actualizado_at FROM instituciones ORDER BY activa DESC,nombre`);
}

export async function listarExcepcionesPersonas(){
  return query<any>(`SELECT e.id,e.rut,e.nombre,e.institucion,e.precio_especial,e.descripcion,e.activa,e.fecha_creacion,e.actualizado_por,e.actualizado_at,c.correo FROM excepciones_personas e LEFT JOIN comensales c ON c.rut=e.rut ORDER BY COALESCE(e.activa,0) DESC,e.nombre,e.rut`);
}

export async function buscarComensalesParaExcepcion(q:string){
  const term=`%${q.trim().toLocaleLowerCase('es-CL')}%`;
  return query<any>(`SELECT rut,nombre,institucion,correo FROM comensales WHERE LOWER(COALESCE(rut,'')||' '||COALESCE(nombre,'')||' '||COALESCE(institucion,'')) LIKE $1 ORDER BY nombre LIMIT 20`,[term]);
}

export async function actualizarValorInstitucion(input:{nombre:string;precioDia:number;precioEspecial:number|null;reglaActiva:boolean;descripcion:string;usuario:string}){
  if(!input.nombre.trim()) throw new Error('Institución inválida.');
  if(input.precioDia<0) throw new Error('El valor del servicio no puede ser negativo.');
  if(input.reglaActiva&&(input.precioEspecial==null||input.precioEspecial<0)) throw new Error('Ingresa un valor especial válido o desactiva la regla especial.');
  const rows=await query<{nombre:string}>(`UPDATE instituciones SET precio_dia=$2,precio_especial=$3,regla_activa=$4,descripcion=$5,actualizado_por=$6,actualizado_at=$7 WHERE nombre=$1 RETURNING nombre`,[input.nombre,Math.trunc(input.precioDia),input.precioEspecial==null?null:Math.trunc(input.precioEspecial),input.reglaActiva?1:0,input.descripcion.trim()||null,input.usuario,new Date().toISOString()]);
  if(!rows[0]) throw new Error('Institución no encontrada.');
}

export async function guardarExcepcionPersona(input:{rut:string;precioEspecial:number;descripcion:string;activa:boolean;usuario:string}){
  const rut=normalizarRutDb(input.rut);
  if(!rut) throw new Error('RUT inválido.');
  if(input.precioEspecial<0) throw new Error('El valor especial no puede ser negativo.');
  const persona=(await query<any>(`SELECT rut,nombre,institucion FROM comensales WHERE rut=$1 LIMIT 1`,[rut]))[0];
  if(!persona) throw new Error('El RUT debe corresponder a un comensal registrado.');
  await query(`INSERT INTO excepciones_personas (rut,nombre,institucion,precio_especial,descripcion,activa,fecha_creacion,actualizado_por,actualizado_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7)
    ON CONFLICT (rut) WHERE rut IS NOT NULL DO UPDATE SET nombre=EXCLUDED.nombre,institucion=EXCLUDED.institucion,precio_especial=EXCLUDED.precio_especial,descripcion=EXCLUDED.descripcion,activa=EXCLUDED.activa,actualizado_por=EXCLUDED.actualizado_por,actualizado_at=EXCLUDED.actualizado_at`,[rut,persona.nombre,persona.institucion,Math.trunc(input.precioEspecial),input.descripcion.trim()||null,input.activa?1:0,new Date().toISOString(),input.usuario]);
}

export async function cambiarEstadoExcepcionPersona(rutInput:string,activa:boolean,usuario:string){
  const rut=normalizarRutDb(rutInput);
  const rows=await query<{rut:string}>(`UPDATE excepciones_personas SET activa=$2,actualizado_por=$3,actualizado_at=$4 WHERE rut=$1 RETURNING rut`,[rut,activa?1:0,usuario,new Date().toISOString()]);
  if(!rows[0]) throw new Error('Excepción no encontrada.');
}
