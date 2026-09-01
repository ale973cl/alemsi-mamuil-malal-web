import 'server-only';
import crypto from 'node:crypto';
import { inTransaction, query } from '@/lib/db/pool';
import { obtenerComensal, obtenerPrecioPersona } from '@/lib/db/comensales';
import { validarPlatoPublicado } from '@/lib/db/minutas';
import {
  REGLAS_RESERVA_DEFAULT,
  fechaDentroVentanaMaxima,
  distribuirPrecioDia,
  limpiarRut,
  maxConsecutivosFechas,
  normalizarRutDb,
  reservaInstitucionHabilitada,
  horaCorteReservaParaInstitucion,
  tipoInstitucion,
  validarEleccionesPorDia,
  type EleccionReserva,
  type ReglasReserva,
} from '@/lib/reglas/reserva';

export async function obtenerReglasReserva(): Promise<ReglasReserva> {
  try {
    const rows = await query<Partial<ReglasReserva>>(
      `SELECT anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas,
              modalidad_cierre,anticipacion_oficina_horas,anticipacion_paso_horas,anticipacion_otros_horas,ventana_maxima_dias
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
    referencia_reserva:string;
    codigo_reserva:string;
    primera_fecha:string;
    ultima_fecha:string;
    monto_pendiente:number;
    estados:string;
  }>(
    `SELECT codigo_reserva AS referencia_reserva,
            codigo_reserva,
            MIN(fecha)::text AS primera_fecha,
            MAX(fecha)::text AS ultima_fecha,
            SUM(COALESCE(precio_aplicado,precio,0))::numeric AS monto_pendiente,
            STRING_AGG(DISTINCT COALESCE(NULLIF(TRIM(estado_pago),''),'Pendiente'), ', ') AS estados
       FROM solicitudes
      WHERE rut=$1
        AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'
        AND COALESCE(precio_aplicado,precio,0)>0
        AND COALESCE(tipo_registro,'RESERVA_COMERCIAL')='RESERVA_COMERCIAL'
        AND COALESCE(NULLIF(codigo_reserva,''),'')<>''
        AND LOWER(TRIM(COALESCE(estado_pago,'Pendiente'))) NOT IN
            ('pagado','aprobado','no aplica','costo asumido','costo asumido / no cobrable')
      GROUP BY codigo_reserva
      ORDER BY MIN(fecha),codigo_reserva`,
    [normalizarRutDb(rut)],
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

async function codigoReservaPublico(): Promise<string> {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const prefijo = `R-${parts.day}${parts.month}${parts.year.slice(-2)}-${parts.hour}${parts.minute}-`;
  const rows = await query<{ codigo_reserva: string | null }>(
    `SELECT codigo_reserva FROM solicitudes WHERE codigo_reserva LIKE $1 ORDER BY id DESC LIMIT 1000`,
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
  const horaCorte=horaCorteReservaParaInstitucion(reglas,institucion);
  const fechas = [...new Set(input.elecciones.map((item) => item.fecha))].sort();

  if (!fechas.length) throw new Error('No hay fechas seleccionadas.');
  validarEleccionesPorDia(fechas, input.elecciones, institucion);

  if (tipo === 'administrativos' && input.elecciones.some((item) => item.servicio !== 'Almuerzo')) {
    throw new Error('ALEMSI Administrativos solo puede reservar Almuerzo.');
  }
  if (tipo === 'paso') {
    const opcionInvalida = input.elecciones.find((item) => {
      const op = String(item.tipo_opcion || '').trim().toUpperCase().replaceAll('Ó','O');
      return op && !['OPCION 1','HIPOCALORICO'].includes(op);
    });
    if (opcionInvalida) throw new Error('La modalidad ALEMSI Paso solo permite Opción 1 o Hipocalórico.');
  }

  if (!esAlem && !esCoordinador) {
    const pendientes = await obtenerDeudaBloqueante(rut);
    if (pendientes.length) {
      throw new Error('Tienes una reserva activa pendiente de validación o pago. Debes regularizarla antes de crear otra reserva.');
    }
    if (maxConsecutivosFechas(fechas) > Number(reglas.max_dias_consecutivos)) {
      throw new Error(`Máximo permitido: ${reglas.max_dias_consecutivos} días consecutivos.`);
    }
  }

  const existentes = await query<{fecha:string;codigo_reserva:string|null}>(
    `SELECT fecha::text AS fecha,
            MAX(codigo_reserva) AS codigo_reserva
       FROM solicitudes
      WHERE rut=$1
        AND fecha = ANY($2::text[])
        AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'
      GROUP BY fecha
      ORDER BY fecha`,
    [rut, fechas],
  );
  if (existentes.length) {
    const dias = existentes.map((x) => x.fecha).join(', ');
    throw new Error(`Ya tienes una reserva activa para ${dias}. Se conserva la primera; usa Mis reservas → Editar para cambiar plato u opción.`);
  }

  const ahoraValidacion = new Date();
  for (const item of input.elecciones) {
    if(!fechaDentroVentanaMaxima(item.fecha,Number(reglas.ventana_maxima_dias),ahoraValidacion)) throw new Error(`${item.fecha} está fuera de la ventana máxima de reserva.`);
    const exception = Number(reglas.excepciones_habilitadas) === 1 && (await excepcionReservaActiva(rut, item.fecha));
    if (!exception && !reservaInstitucionHabilitada(item.fecha,institucion,reglas,ahoraValidacion)) {
      throw new Error(`La fecha ${item.fecha} ya está cerrada. El corte para ${institucion} es a las ${String(horaCorte).padStart(2,'0')}:00 del día anterior.`);
    }
    if (!(await validarPlatoPublicado(item))) {
      throw new Error(`El plato ${item.plato} ya no está disponible para ${item.fecha} · ${item.servicio}.`);
    }
  }

  const precioPersona = await obtenerPrecioPersona(rut, institucion);
  const codigoPublico = await codigoReservaPublico();
  const referencia = codigoPublico;
  const pagoToken = !esAlem ? crypto.randomBytes(32).toString('base64url') : '';
  const ahora = new Date().toISOString();
  const metodo = esAlem ? 'Interno ALEMSI' : input.metodoPago || 'Transferencia bancaria';

  const porFecha = new Map<string, EleccionReserva[]>();
  for (const item of input.elecciones) {
    porFecha.set(item.fecha, [...(porFecha.get(item.fecha) ?? []), item]);
  }

  await inTransaction(async (client) => {
    for (const fecha of fechas) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${rut}|${fecha}|DIA`]);
      const duplicado = await client.query(
        `SELECT id FROM solicitudes
          WHERE rut=$1 AND fecha=$2
            AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'
          LIMIT 1 FOR UPDATE`,
        [rut, fecha],
      );
      if (duplicado.rows[0]) {
        throw new Error(`Ya tienes una reserva activa para ${fecha}. Se conserva la primera; debes editarla desde Mis reservas.`);
      }
    }

    for (const item of input.elecciones) {
      const lineasDia = porFecha.get(item.fecha) ?? [];
      const posicion = lineasDia.findIndex((x) => x === item);
      const precios = distribuirPrecioDia(precioPersona.precio, lineasDia.length);
      const precioLinea = esAlem ? 0 : precios[Math.max(0, posicion)] ?? 0;
      const estadoPago = esAlem ? 'No aplica' : 'Pendiente';
      const estadoConsumo = esAlem ? 'Consumirá' : 'Pendiente';
      const tipoRegistro = esAlem ? 'CONSUMO_INTERNO' : esCoordinador ? 'CONSUMO_COORDINADOR' : 'RESERVA_COMERCIAL';
      const voucher = esAlem ? null : codigoVoucher(rut, item.servicio, item.fecha);

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

    if (pagoToken) {
      await client.query('UPDATE solicitudes SET pago_token=$1 WHERE codigo_reserva=$2', [pagoToken, codigoPublico]);
    }
  });

  return {
    referencia: codigoPublico,
    codigoReserva: codigoPublico,
    pagoToken,
    total: esAlem ? 0 : fechas.length * precioPersona.precio,
    precioDia: esAlem ? 0 : precioPersona.precio,
    glosaPrecio: precioPersona.glosa,
    esAlem,
    esCoordinador,
    correo: String(persona.correo || ''),
  };
}
