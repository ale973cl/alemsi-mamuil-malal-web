import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { normalizarRutDb, validarRutM11 } from '@/lib/reglas/reserva';

async function asegurarEncuestas(){
  await inTransaction(async c=>{
    await c.query(`CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
      id SERIAL PRIMARY KEY,rut TEXT NOT NULL,codigo_reserva TEXT NOT NULL,fecha_servicio TEXT NOT NULL,
      servicio_general INTEGER NOT NULL,comida INTEGER NOT NULL,presentacion INTEGER NOT NULL,
      temperatura INTEGER NOT NULL,atencion INTEGER NOT NULL,plataforma_facilidad INTEGER NOT NULL,
      plataforma_claridad INTEGER NOT NULL,plataforma_agilidad INTEGER NOT NULL,
      observacion_servicio TEXT,mejora_plataforma TEXT,creada_at TEXT NOT NULL,
      UNIQUE(rut,codigo_reserva,fecha_servicio))`);
  });
}

export async function guardarEncuesta(input:{rut:string;codigo:string;fecha:string;servicioGeneral:number;comida:number;presentacion:number;temperatura:number;atencion:number;facilidad:number;claridad:number;agilidad:number;observacion:string;mejora:string}){
  await asegurarEncuestas();
  if(!validarRutM11(input.rut)) throw new Error('RUT inválido.');
  const notas=[input.servicioGeneral,input.comida,input.presentacion,input.temperatura,input.atencion,input.facilidad,input.claridad,input.agilidad];
  if(notas.some(n=>!Number.isInteger(n)||n<1||n>5)) throw new Error('Todas las evaluaciones deben estar entre 1 y 5.');
  if(Math.min(input.servicioGeneral,input.comida,input.presentacion,input.temperatura,input.atencion)<=2&&!input.observacion.trim()) throw new Error('Cuéntanos qué ocurrió cuando la evaluación del servicio es baja.');
  const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)||input.fecha>=hoy) throw new Error('La encuesta se habilita después de finalizar el servicio.');
  const rut=normalizarRutDb(input.rut);
  const propia=await query<any>(`SELECT 1 FROM solicitudes WHERE rut=$1 AND codigo_reserva=$2 AND fecha=$3 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' LIMIT 1`,[rut,input.codigo,input.fecha]);
  if(!propia.length) throw new Error('No encontramos un servicio finalizado asociado a esta reserva.');
  await query(`INSERT INTO encuestas_satisfaccion (rut,codigo_reserva,fecha_servicio,servicio_general,comida,presentacion,temperatura,atencion,plataforma_facilidad,plataforma_claridad,plataforma_agilidad,observacion_servicio,mejora_plataforma,creada_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (rut,codigo_reserva,fecha_servicio) DO UPDATE SET servicio_general=EXCLUDED.servicio_general,comida=EXCLUDED.comida,presentacion=EXCLUDED.presentacion,temperatura=EXCLUDED.temperatura,atencion=EXCLUDED.atencion,plataforma_facilidad=EXCLUDED.plataforma_facilidad,plataforma_claridad=EXCLUDED.plataforma_claridad,plataforma_agilidad=EXCLUDED.plataforma_agilidad,observacion_servicio=EXCLUDED.observacion_servicio,mejora_plataforma=EXCLUDED.mejora_plataforma,creada_at=EXCLUDED.creada_at`,
    [rut,input.codigo,input.fecha,...notas,input.observacion.trim()||null,input.mejora.trim()||null,new Date().toISOString()]);
}

export async function resumenSatisfaccion(){
  await asegurarEncuestas();
  const rows=await query<any>(`SELECT COUNT(*)::int respuestas,ROUND(AVG(servicio_general),2) servicio,
    ROUND(AVG((plataforma_facilidad+plataforma_claridad+plataforma_agilidad)/3.0),2) plataforma,
    COUNT(*) FILTER (WHERE servicio_general<=2)::int bajas FROM encuestas_satisfaccion`);
  return rows[0]||{respuestas:0,servicio:null,plataforma:null,bajas:0};
}

export async function listarEncuestasRecientes(){
  await asegurarEncuestas();
  return query<any>(`SELECT * FROM encuestas_satisfaccion ORDER BY id DESC LIMIT 100`);
}
