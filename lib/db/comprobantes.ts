import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';

export async function obtenerReservaPorPagoToken(token: string) {
  const rows = await query<{
    rut: string;
    referencia_reserva: string;
    institucion: string | null;
    estado_pago: string | null;
    correo: string | null;
  }>(
    `SELECT rut,referencia_reserva,institucion,estado_pago,correo
       FROM solicitudes
      WHERE pago_token=$1
      ORDER BY fecha
      LIMIT 1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function comprobanteYaCargado(token: string): Promise<boolean> {
  const rows = await query<{ estado: string | null }>(
    `SELECT estado FROM comprobantes_pago WHERE pago_token=$1 ORDER BY id DESC LIMIT 1`,
    [token],
  );
  return Boolean(rows[0]) && !['OBSERVADO','RECHAZADO'].includes(String(rows[0].estado || '').toUpperCase());
}

export async function guardarComprobanteEnPostgres(input: {
  token: string;
  referencia: string;
  rut: string;
  nombre: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  await inTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`COMPROBANTE|${input.token}`]);
    const anterior = await client.query<{ estado: string | null }>(
      `SELECT estado FROM comprobantes_pago WHERE pago_token=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [input.token],
    );
    if (anterior.rows[0] && !['OBSERVADO','RECHAZADO'].includes(String(anterior.rows[0].estado || '').toUpperCase())) {
      throw new Error('Ya existe un comprobante asociado a esta reserva.');
    }
    await client.query(
      `INSERT INTO comprobantes_pago
        (referencia_reserva,pago_token,rut,nombre_archivo,mime_type,contenido,fecha_carga,estado,storage_provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'RECIBIDO','POSTGRESQL_FALLBACK')`,
      [input.referencia, input.token, input.rut, input.nombre, input.mimeType, Buffer.from(input.bytes), new Date().toISOString()],
    );
    await client.query(
      `UPDATE solicitudes
          SET comprobante_url=$1,estado_pago='Comprobante recibido',motivo_estado_pago='Pendiente de validación por Finanzas'
        WHERE pago_token=$2`,
      [`DB:${input.referencia}`, input.token],
    );
  });
}
