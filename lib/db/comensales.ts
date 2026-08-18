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

export async function obtenerComensal(rut: string): Promise<Comensal | null> {
  const rows = await query<Comensal>(
    `SELECT rut,nombre,telefono,correo,institucion
       FROM comensales
      WHERE rut=$1
      LIMIT 1`,
    [normalizarRutDb(rut)],
  );
  return rows[0] ?? null;
}

export async function obtenerPrecioPersona(rut: string, institucion: string): Promise<{ precio: number; glosa: string }> {
  const excepcion = await query<{ precio_especial: number; descripcion: string | null }>(
    `SELECT precio_especial,descripcion
       FROM excepciones_personas
      WHERE rut=$1 AND activa=1
      LIMIT 1`,
    [normalizarRutDb(rut)],
  );
  if (excepcion[0]) {
    return { precio: Number(excepcion[0].precio_especial), glosa: `Excepción: ${excepcion[0].descripcion ?? ''}` };
  }

  const rows = await query<{ precio_dia: number; precio_especial: number | null; regla_activa: number | boolean | null }>(
    `SELECT precio_dia,precio_especial,regla_activa
       FROM instituciones
      WHERE nombre=$1
      LIMIT 1`,
    [institucion],
  );
  if (!rows[0]) return { precio: 6400, glosa: `Institución ${institucion}` };
  const row = rows[0];
  const usarEspecial = Boolean(row.regla_activa) && row.precio_especial != null;
  return { precio: Number(usarEspecial ? row.precio_especial : row.precio_dia), glosa: `Institución ${institucion}` };
}
