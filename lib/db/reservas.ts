import 'server-only';
import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { inTransaction, query } from '@/lib/db/pool';
import { obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { validarPlatoPublicado } from '@/lib/db/minutas';
import {
  REGLAS_RESERVA_DEFAULT,
  distribuirPrecioDia,
  fechaActualIso,
  limpiarRut,
  maxConsecutivosFechas,
  normalizarRutDb,
  reservaComercialHabilitada,
  tipoInstitucion,
  validarEleccionesPorDia,
  type EleccionReserva,
  type ReglasReserva,
} from '@/lib/reglas/reserva';

export async function obtenerReglasReserva(): Promise<ReglasReserva> {
  try {
    const rows = await query<Partial<ReglasReserva>>(
      `SELECT anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas
         FROM configuracion_reservas
        WHERE id=1
        LIMIT 1`,
    );
    return { ...REGLAS_RESERVA_DEFAULT, ...(rows[0] ?? {}) } as ReglasReserva;
  } catch {
    return REGLAS_RESERVA_DEFAULT;
  }
}

export async function obtenerDeudaBloqueante(rut: string) {
  return query<{
    referencia_reserva: string;
    primera_fecha: string;
    ultima_fecha: string;
    monto_pendiente: number;
    estados: string;
  }>(
    `SELECT referencia_reserva,
            MIN(fecha) AS primera_fecha,
            MAX(fecha) AS ultima_fecha,
            SUM(COALESCE(precio_aplicado,precio,0)) AS monto_pendiente,
            STRING_AGG(DISTINCT COALESCE(NULLIF(TRIM(estado_pago),''),'Pendiente'), ', ') AS estados
       FROM solicitudes
      WHERE rut=$1
        AND fecha < $2
        AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'
        AND COALESCE(precio_aplicado,precio,0)>0
        AND COALESCE(tipo_registro,'RESERVA_COMERCIAL')='RESERVA_COMERCIAL'
        AND LOWER(TRIM(COALESCE(estado_pago,'Pendiente'))) NOT IN
            ('pagado','no aplica','costo asumido','costo asumido / no cobrable')
      GROUP BY referencia_reserva
      ORDER BY MIN(fecha),referencia_reserva`,
    [normalizarRutDb(rut), fechaActualIso()],
  );
}

async function excepcionReservaActiva(rut: string, fecha: string): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `SELECT id
       FROM excepciones_reserva
      WHERE rut=$1 AND activa=1 AND fecha_desde<=$2 AND fecha_hasta>=$2
      ORDER BY id DESC LIMIT 1`,
    [normalizarRutDb(rut), fecha],
  );
  return Boolean(rows[0]);
}

function referenciaReserva(rut: string): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const sello = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}`;
  const rutCorto = limpiarRut(rut).slice(-5, -1) || '0000';
  return `MM-${sello}-${rutCorto}-${crypto.randomInt(1000, 10_000)}`;
}

async function codigoReservaPublico(): Promise<string> {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const prefijo = `R-${p(now.getDate())}${p(now.getMonth() + 1)}-${p(now.getHours())}${p(now.getMinutes())}-`;
  const rows = await query<{ codigo_reserva: string | null }>(
    `SELECT codigo_reserva FROM solicitudes WHERE codigo_reserva LIKE $1 ORDER BY id DESC LIMIT 100`,
    [`${prefijo}%`],
  );
  const usados = new Set(rows.map((row) => String(row.codigo_reserva ?? '')));
  for (let n = 1; n < 1000; n += 1) {
    const code = `${prefijo}${String(n).padStart(3, '0')}`;
    if (!usados.has(code)) return code;
  }
  return `${prefijo}${String(Math.floor(Date.now() / 1000) % 1000).padStart(3, '0')}`;
}

function codigoVoucher(rut: string, servicio: string, fecha: string): string {
  return `${limpiarRut(rut).slice(0, 4)}-${servicio.slice(0, 3).toUpperCase()}-${fecha.slice(8, 10)}${fecha.slice(5, 7)}-${crypto.randomInt(100, 1000)}`;
}

async function filaExistente(client: PoolClient, rut: string, item: EleccionReserva) {
  const result = await client.query<{ id: number; codigo: string | null; referencia_reserva: string | null }>(
    `SELECT id,codigo,referencia_reserva
       FROM solicitudes
      WHERE rut=$1 AND fecha=$2 AND servicio=$3
        AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE`,
    [rut, item.fecha, item.servicio],
  );
  return result.rows[0] ?? null;
}

export type CrearReservaInput = {
  rut: string;
  elecciones: EleccionReserva[];
  metodoPago?: 'Transferencia bancaria' | 'Débito en la instalación';
};

export async function crearOActualizarReserva(input: CrearReservaInput) {
  const rut = normalizarRutDb(input.rut);
  const persona = await obtenerComensal(rut);
  if (!persona) throw new Error('Comensal no encontrado.');
  const institucion = persona.institucion?.trim() || 'Visitas';
  const tipo = tipoInstitucion(institucion);
  const esAlem = tipo === 'paso' || tipo === 'administrativos';
  const esCoordinador = tipo === 'coordinadores';
  const reglas = await obtenerReglasReserva();
  const fechas = [...new Set(input.elecciones.map((item) => item.fecha))].sort();

  if (!fechas.length) throw new Error('No hay fechas seleccionadas.');
  validarEleccionesPorDia(fechas, input.elecciones, institucion);

  if (!esAlem && !esCoordinador) {
    const deudas = await obtenerDeudaBloqueante(rut);
    if (deudas.length) {
      throw new Error('Tienes servicios anteriores con pago pendiente o rechazado. Debes regularizarlos antes de realizar una nueva reserva.');
    }
    if (maxConsecutivosFechas(fechas) > Number(reglas.max_dias_consecutivos)) {
      throw new Error(`Máximo permitido: ${reglas.max_dias_consecutivos} días consecutivos.`);
    }
  }

  for (const item of input.elecciones) {
    const exception = Number(reglas.excepciones_habilitadas) === 1 && (await excepcionReservaActiva(rut, item.fecha));
    if (!esAlem && !exception && !reservaComercialHabilitada(item.fecha, item.servicio, Number(reglas.anticipacion_reserva_horas))) {
      throw new Error(`${item.servicio} del ${item.fecha} está fuera del plazo de reserva.`);
    }
    if (!(await validarPlatoPublicado(item))) {
      throw new Error(`El plato ${item.plato} ya no está disponible para ${item.fecha} · ${item.servicio}.`);
    }
  }

  const precioPersona = await obtenerPrecioPersona(rut, institucion);
  let referencia = referenciaReserva(rut);
  let codigoPublico = await codigoReservaPublico();
  let pagoToken = !esAlem && !esCoordinador ? crypto.randomBytes(32).toString('base64url') : '';
  const ahora = new Date().toISOString();
  const metodo = esAlem
    ? 'Interno ALEMSI'
    : esCoordinador
      ? 'Costo asumido · Coordinadores'
      : input.metodoPago || 'Transferencia bancaria';

  const porFecha = new Map<string, EleccionReserva[]>();
  for (const item of input.elecciones) {
    porFecha.set(item.fecha, [...(porFecha.get(item.fecha) ?? []), item]);
  }

  await inTransaction(async (client) => {
    const claveSolicitud=input.elecciones.map(x=>`${x.fecha}|${x.servicio}|${x.plato}`).sort().join(';');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`RESERVA|${rut}|${claveSolicitud}`]);
    const previa=await client.query<{referencia_reserva:string;codigo_reserva:string|null;pago_token:string|null}>(`SELECT referencia_reserva,codigo_reserva,pago_token FROM solicitudes WHERE rut=$1 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha=ANY($2::text[]) ORDER BY id DESC LIMIT 1 FOR UPDATE`,[rut,fechas]);
    if(previa.rows[0]?.referencia_reserva) referencia=previa.rows[0].referencia_reserva;
    if(previa.rows[0]?.codigo_reserva) codigoPublico=previa.rows[0].codigo_reserva;
    for (const item of input.elecciones) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${rut}|${item.fecha}|${item.servicio}`]);
      const existente = await filaExistente(client, rut, item);
      if (existente?.referencia_reserva) referencia = existente.referencia_reserva;

      const publicada=await client.query(`SELECT id FROM minutas WHERE activo=1 AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE' AND fecha=$1 AND servicio=$2 AND plato=$3 LIMIT 1 FOR SHARE`,[item.fecha,item.servicio,item.plato]);
      if(!publicada.rows[0]) throw new Error(`El plato ${item.plato} ya no está disponible para ${item.fecha} · ${item.servicio}.`);

      if (existente) {
        const exception = Number(reglas.excepciones_habilitadas) === 1 && (await excepcionReservaActiva(rut, item.fecha));
        if (!exception && !reservaComercialHabilitada(item.fecha, item.servicio, Number(reglas.anticipacion_reserva_horas))) {
          throw new Error(`${item.servicio} del ${item.fecha} ya no puede modificarse porque está fuera del plazo configurado.`);
        }
      }

      const lineasDia = porFecha.get(item.fecha) ?? [];
      const posicion = lineasDia.findIndex((x) => x === item);
      const precios = distribuirPrecioDia(precioPersona.precio, lineasDia.length);
      const precioLinea = esAlem ? 0 : precios[Math.max(0, posicion)] ?? 0;
      const estadoPago = esAlem ? 'No aplica' : esCoordinador ? 'Costo asumido' : 'Pendiente';
      const estadoConsumo = esAlem ? 'Consumirá' : 'Pendiente';
      const tipoRegistro = esAlem ? 'CONSUMO_INTERNO' : esCoordinador ? 'CONSUMO_COORDINADOR' : 'RESERVA_COMERCIAL';
      const voucher = esAlem ? null : existente?.codigo || codigoVoucher(rut, item.servicio, item.fecha);

      if (existente) {
        await client.query(
          `UPDATE solicitudes
              SET plato=$1,plato_reservado=$1,tipo_opcion=COALESCE($2,tipo_opcion),codigo=COALESCE(codigo,$3),
                  precio=$4,precio_aplicado=$4,institucion=$5,correo=$6,metodo_pago=$7,estado_pago=$8,
                  estado_consumo=$9,fecha_modificacion=$10,modificado_por=$11,referencia_reserva=$12,
                  codigo_reserva=COALESCE(NULLIF(codigo_reserva,''),$13),tipo_registro=$14,estado_reserva='ACTIVA'
            WHERE id=$15`,
          [
            item.plato,
            item.tipo_opcion || null,
            voucher,
            precioLinea,
            institucion,
            persona.correo || '',
            metodo,
            estadoPago,
            estadoConsumo,
            ahora,
            rut,
            referencia,
            codigoPublico,
            tipoRegistro,
            existente.id,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO solicitudes
            (rut,fecha,servicio,plato,plato_reservado,tipo_opcion,codigo,precio,precio_aplicado,
             institucion,correo,metodo_pago,estado_pago,estado_consumo,fecha_creacion,fecha_modificacion,
             modificado_por,referencia_reserva,codigo_reserva,tipo_registro,estado_reserva)
           VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$13,$1,$14,$15,$16,'ACTIVA')`,
          [
            rut,
            item.fecha,
            item.servicio,
            item.plato,
            item.tipo_opcion || null,
            voucher,
            precioLinea,
            institucion,
            persona.correo || '',
            metodo,
            estadoPago,
            estadoConsumo,
            ahora,
            referencia,
            codigoPublico,
            tipoRegistro,
          ],
        );
      }
    }

    if (pagoToken) {
      const tokenExistente=previa.rows[0]?.pago_token||'';
      await client.query('UPDATE solicitudes SET pago_token=$1 WHERE referencia_reserva=$2', [tokenExistente||pagoToken, referencia]);
      if(tokenExistente) pagoToken=tokenExistente;
    }
  });

  return {
    referencia,
    codigoReserva: codigoPublico,
    pagoToken,
    total: esAlem ? 0 : fechas.length * precioPersona.precio,
    precioDia: esAlem ? 0 : precioPersona.precio,
    glosaPrecio: precioPersona.glosa,
    esAlem,
    esCoordinador,
  };
}
