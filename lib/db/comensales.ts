import 'server-only';
import { query } from '@/lib/db/pool';
import { normalizarRutDb } from '@/lib/reglas/reserva';

export type Comensal = {
  rut: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  institucion: string | null;
};

export type NuevoComensal = { rut:string; nombre:string; telefono:string; correo:string; institucion:string };

export async function obtenerComensal(rut: string): Promise<Comensal | null> {
  const rows = await query<Comensal>(
    `SELECT rut,nombre,telefono,correo,institucion FROM comensales WHERE rut=$1 LIMIT 1`,
    [normalizarRutDb(rut)],
  );
  return rows[0] ?? null;
}

export async function listarInstitucionesActivas():Promise<string[]> {
  const rows=await query<{nombre:string}>(`SELECT nombre FROM instituciones WHERE activa=1 ORDER BY nombre`);
  return rows.map((row)=>row.nombre);
}

export async function crearComensal(input:NuevoComensal):Promise<Comensal> {
  const rut=normalizarRutDb(input.rut);
  const insertados=await query<Comensal>(
    `INSERT INTO comensales (rut,nombre,telefono,correo,institucion,fecha_registro)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (rut) DO NOTHING
     RETURNING rut,nombre,telefono,correo,institucion`,
    [rut,input.nombre.trim(),input.telefono.trim(),input.correo.trim().toLowerCase(),input.institucion.trim(),new Date().toISOString()],
  );
  if(insertados[0]) return insertados[0];
  const existente=await obtenerComensal(rut);
  if(!existente) throw new Error('No fue posible registrar el comensal.');
  return existente;
}

export async function obtenerPrecioPersona(rut: string, institucion: string): Promise<{ precio: number; glosa: string }> {
  const excepcion = await query<{ precio_especial: number; descripcion: string | null }>(
    `SELECT precio_especial,descripcion FROM excepciones_personas WHERE rut=$1 AND activa=1 LIMIT 1`,
    [normalizarRutDb(rut)],
  );
  if (excepcion[0]) {
    return { precio: Number(excepcion[0].precio_especial), glosa: `Excepción individual${excepcion[0].descripcion?`: ${excepcion[0].descripcion}`:''}` };
  }

  const rows = await query<{ precio_dia: number | null; precio_especial: number | null; regla_activa: number | boolean | null }>(
    `SELECT precio_dia,precio_especial,regla_activa FROM instituciones WHERE nombre=$1 LIMIT 1`,
    [institucion],
  );
  if (!rows[0]) throw new Error(`La institución ${institucion} no tiene un valor de servicio configurado.`);
  const row = rows[0];
  const usarEspecial = Boolean(row.regla_activa) && row.precio_especial != null;
  const precio=usarEspecial?row.precio_especial:row.precio_dia;
  if(precio==null||!Number.isFinite(Number(precio))||Number(precio)<0) throw new Error(`La institución ${institucion} no tiene un valor de servicio válido configurado.`);
  return { precio: Number(precio), glosa: usarEspecial?`Valor especial institucional · ${institucion}`:`Valor institucional · ${institucion}` };
}
