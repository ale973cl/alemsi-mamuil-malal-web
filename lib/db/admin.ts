import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
import { normalizarFilaMinuta, validarFilasMinuta, type FilaMinutaInput } from '@/lib/reglas/minutas';

export async function getReglas(){
  const r=await query<any>(`SELECT * FROM configuracion_reservas WHERE id=1`);
  return r[0]||{anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1};
}
export async function setReglas(v:any,u:string){
  await inTransaction(async c=>{
    await c.query(`INSERT INTO configuracion_reservas (id,anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas,modalidad_cierre,anticipacion_oficina_horas,anticipacion_otros_horas,ventana_maxima_dias) VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET anticipacion_reserva_horas=EXCLUDED.anticipacion_reserva_horas,cancelacion_directa_horas=EXCLUDED.cancelacion_directa_horas,max_dias_consecutivos=EXCLUDED.max_dias_consecutivos,excepciones_habilitadas=EXCLUDED.excepciones_habilitadas,modalidad_cierre=EXCLUDED.modalidad_cierre,anticipacion_oficina_horas=EXCLUDED.anticipacion_oficina_horas,anticipacion_otros_horas=EXCLUDED.anticipacion_otros_horas,ventana_maxima_dias=EXCLUDED.ventana_maxima_dias`,[v.a,v.c,v.m,v.e,v.modalidad,v.oficina,v.otros,v.ventana]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'ACTUALIZAR_REGLAS_RESERVA'});
  });
}
export async function resumenAdmin(){
  const rows=await query<any>(`SELECT
    (SELECT COUNT(DISTINCT referencia_reserva) FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha>=CURRENT_DATE::text) reservas,
    (SELECT COUNT(*) FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha>=CURRENT_DATE::text) raciones,
    (SELECT COUNT(*) FROM solicitudes WHERE LOWER(COALESCE(estado_pago,'pendiente')) NOT IN ('pagado','no aplica','costo asumido','costo asumido / no cobrable') AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA') pendientes,
    (SELECT COUNT(*) FROM minutas WHERE activo=1 AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE' AND fecha>=CURRENT_DATE::text) minutas,
    (SELECT COUNT(*) FROM solicitudes_extraordinarias WHERE estado='PENDIENTE') solicitudes`);
  return rows[0]||{};
}
export async function minutasPeriodo(inicio:string,fin:string,soloOperativasDesde?:string){
  return query<any>(`SELECT m.id,m.fecha,m.servicio,m.tipo_opcion,m.plato,COALESCE(m.estado,'PUBLICABLE') estado FROM minutas m WHERE m.activo=1 AND m.fecha BETWEEN $1 AND $2 ${soloOperativasDesde?`AND m.fecha >= $3 AND NOT EXISTS (SELECT 1 FROM jornadas_produccion j WHERE j.fecha=m.fecha AND j.estado='Finalizado')`:''} ORDER BY m.fecha,CASE m.servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,m.tipo_opcion,m.id`,soloOperativasDesde?[inicio,fin,soloOperativasDesde]:[inicio,fin]);
}
export async function platosDisponibles(){
  return query<{plato:string;tiene_receta:boolean}>(`WITH nombres AS (SELECT plato FROM minutas WHERE COALESCE(activo,1)=1 UNION SELECT plato FROM recetas WHERE UPPER(TRIM(COALESCE(estado,''))) IN ('ACTIVA','ACTIVO','APROBADA','APROBADO')) SELECT nombres.plato,EXISTS(SELECT 1 FROM recetas r WHERE LOWER(TRIM(r.plato))=LOWER(TRIM(nombres.plato)) AND UPPER(TRIM(COALESCE(r.estado,''))) IN ('ACTIVA','ACTIVO','APROBADA','APROBADO')) tiene_receta FROM nombres WHERE COALESCE(TRIM(nombres.plato),'')<>'' ORDER BY nombres.plato`);
}
export async function guardarMinuta(v:{id?:number;fecha:string;servicio:string;tipo_opcion:string;plato:string},u:string){
  const row=normalizarFilaMinuta(v); const errores=validarFilasMinuta([row]);
  if(errores.length) throw new Error(errores.map(error=>error.mensaje).join(' '));
  await inTransaction(async c=>{
    const duplicada=await c.query(`SELECT id FROM minutas WHERE COALESCE(activo,1)=1 AND fecha=$1 AND servicio=$2 AND UPPER(TRIM(tipo_opcion))=$3 AND ($4::integer IS NULL OR id<>$4) LIMIT 1 FOR UPDATE`,[row.fecha,row.servicio,row.tipo_opcion,v.id||null]);
    if(duplicada.rows[0]) throw new Error('Ya existe una fila para la misma fecha, servicio y opción.');
    const otra=await c.query<{plato:string}>(`SELECT plato FROM minutas WHERE COALESCE(activo,1)=1 AND fecha=$1 AND servicio=$2 AND UPPER(TRIM(tipo_opcion))=$3 AND ($4::integer IS NULL OR id<>$4) LIMIT 1`,[row.fecha,row.servicio,row.tipo_opcion==='OPCION 1'?'OPCION 2':row.tipo_opcion==='OPCION 2'?'OPCION 1':'',v.id||null]);
    if(otra.rows[0]&&String(otra.rows[0].plato).trim().toLocaleLowerCase('es-CL')===row.plato.toLocaleLowerCase('es-CL')) throw new Error('Opción 1 y Opción 2 no pueden contener el mismo plato.');
    if(v.id){
      await c.query(`UPDATE minutas SET fecha=$1,servicio=$2,tipo_opcion=$3,plato=$4,activo=1,estado='PUBLICABLE' WHERE id=$5`,[row.fecha,row.servicio,row.tipo_opcion,row.plato,v.id]);
    }else{
      await c.query(`INSERT INTO minutas (fecha,dia_semana,servicio,tipo_opcion,plato,activo,estado) VALUES ($1,'',$2,$3,$4,1,'PUBLICABLE')`,[row.fecha,row.servicio,row.tipo_opcion,row.plato]);
    }
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='REQUIERE_REVALIDACION',observacion=CASE WHEN COALESCE(observacion,'')='' THEN $1 ELSE observacion||' | '||$1 END WHERE COALESCE(activo,1)=1 AND fecha_desde<=$2 AND fecha_hasta>=$2 AND estado IN ('EN_REVISION','AUTORIZADA','PUBLICADA')`,['Minuta editada después de revisión',row.fecha]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'EDITAR_MINUTA'});
  });
}
export async function guardarMinutas(rows:FilaMinutaInput[],u:string){
  const normalizadas=rows.map(normalizarFilaMinuta);
  const errores=validarFilasMinuta(normalizadas);
  if(!normalizadas.length) errores.push({fila:0,campo:'archivo',mensaje:'No hay filas para guardar.'});
  if(errores.length) return {ok:false as const,errores};
  return inTransaction(async c=>{
    const payload=JSON.stringify(normalizadas);
    const duplicado=await c.query<{fecha:string;servicio:string;opcion:string;cantidad:string}>(`
      WITH incoming AS (
        SELECT fecha,servicio,tipo_opcion,plato
        FROM jsonb_to_recordset($1::jsonb) AS x(fecha text,servicio text,tipo_opcion text,plato text)
      )
      SELECT m.fecha,m.servicio,UPPER(TRIM(m.tipo_opcion)) opcion,COUNT(*)::text cantidad
      FROM minutas m
      JOIN incoming i ON m.fecha=i.fecha AND m.servicio=i.servicio AND UPPER(TRIM(m.tipo_opcion))=UPPER(TRIM(i.tipo_opcion))
      WHERE COALESCE(m.activo,1)=1
      GROUP BY m.fecha,m.servicio,UPPER(TRIM(m.tipo_opcion))
      HAVING COUNT(*)>1
      LIMIT 1
    `,[payload]);
    if(duplicado.rows[0]){
      const d=duplicado.rows[0];
      return {ok:false as const,errores:[{fila:0,campo:'opcion',mensaje:`La base contiene ${d.cantidad} registros activos para ${d.fecha} · ${d.servicio} · ${d.opcion}. Corrige ese duplicado antes de continuar.`}]};
    }

    const result=await c.query<{actualizadas:number;creadas:number}>(`
      WITH incoming AS (
        SELECT fecha,servicio,tipo_opcion,plato
        FROM jsonb_to_recordset($1::jsonb) AS x(fecha text,servicio text,tipo_opcion text,plato text)
      ),
      updated AS (
        UPDATE minutas m
           SET plato=i.plato,activo=1,estado='PUBLICABLE'
          FROM incoming i
         WHERE COALESCE(m.activo,1)=1
           AND m.fecha=i.fecha
           AND m.servicio=i.servicio
           AND UPPER(TRIM(m.tipo_opcion))=UPPER(TRIM(i.tipo_opcion))
        RETURNING m.id
      ),
      inserted AS (
        INSERT INTO minutas (fecha,dia_semana,servicio,tipo_opcion,plato,activo,estado)
        SELECT i.fecha,'',i.servicio,UPPER(TRIM(i.tipo_opcion)),i.plato,1,'PUBLICABLE'
          FROM incoming i
         WHERE NOT EXISTS (
           SELECT 1 FROM minutas m
            WHERE COALESCE(m.activo,1)=1
              AND m.fecha=i.fecha
              AND m.servicio=i.servicio
              AND UPPER(TRIM(m.tipo_opcion))=UPPER(TRIM(i.tipo_opcion))
         )
        RETURNING id
      )
      SELECT (SELECT COUNT(*)::int FROM updated) actualizadas,
             (SELECT COUNT(*)::int FROM inserted) creadas
    `,[payload]);

    const fechas=[...new Set(normalizadas.map(row=>row.fecha))];
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='REQUIERE_REVALIDACION',observacion=CASE WHEN COALESCE(observacion,'')='' THEN $1 ELSE observacion||' | '||$1 END WHERE COALESCE(activo,1)=1 AND estado IN ('EN_REVISION','AUTORIZADA','PUBLICADA') AND EXISTS (SELECT 1 FROM unnest($2::text[]) fecha WHERE fecha_desde<=fecha AND fecha_hasta>=fecha)`,['Minuta cargada o editada',fechas]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'CARGA_SEMIMASIVA_MINUTA'});
    return {ok:true as const,cantidad:normalizadas.length,creadas:Number(result.rows[0]?.creadas||0),actualizadas:Number(result.rows[0]?.actualizadas||0)};
  });
}
export async function registrarAutorizacionExterna(inicio:string,fin:string,u:string,observacion:string){
  if(!observacion.trim()) throw new Error('Debes registrar la referencia de la autorización externa.');
  return inTransaction(async c=>{
    const minuta=await c.query(`SELECT id FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 LIMIT 1`,[inicio,fin]);
    if(!minuta.rows[0]) throw new Error('No existe minuta activa en el período.');
    const previa=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE`,[inicio,fin]);
    const version=Number(previa.rows[0]?.version||0)+1;
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,coordinador,coordinacion_at,activo) VALUES ($1,$2,$3,'AUTORIZADA',$4,$5,$6,$5,$6,1)`,[inicio,fin,version,observacion.trim(),u,new Date().toISOString()]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'REGISTRAR_AUTORIZACION_EXTERNA_MINUTA'});
    return version;
  });
}
export async function enviarCoordinacion(inicio:string,fin:string,u:string){
  return inTransaction(async c=>{
    const conflictos=await c.query(`SELECT fecha,servicio,UPPER(TRIM(tipo_opcion)) opcion,COUNT(*) cantidad FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 GROUP BY fecha,servicio,UPPER(TRIM(tipo_opcion)) HAVING COUNT(*)>1 LIMIT 1`,[inicio,fin]);
    if(conflictos.rows[0]) throw new Error('La minuta contiene combinaciones duplicadas. Corrígelas antes de enviarla.');
    const repetido=await c.query(`SELECT a.fecha,a.servicio FROM minutas a JOIN minutas b ON b.fecha=a.fecha AND b.servicio=a.servicio AND UPPER(TRIM(b.tipo_opcion))='OPCION 2' AND LOWER(TRIM(b.plato))=LOWER(TRIM(a.plato)) AND b.id<>a.id WHERE COALESCE(a.activo,1)=1 AND COALESCE(b.activo,1)=1 AND UPPER(TRIM(a.tipo_opcion))='OPCION 1' AND a.fecha BETWEEN $1 AND $2 LIMIT 1`,[inicio,fin]);
    if(repetido.rows[0]) throw new Error('Opción 1 y Opción 2 repiten un plato. Corrige la minuta antes de enviarla.');
    const existe=await c.query(`SELECT id FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 LIMIT 1`,[inicio,fin]);
    if(!existe.rows[0]) throw new Error('No existe minuta activa dentro del período.');
    const prev=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
    const version=Number(prev.rows[0]?.version||0)+1;
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,activo) VALUES ($1,$2,$3,'EN_REVISION','',$4,$5,1)`,[inicio,fin,version,u,new Date().toISOString()]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'ENVIAR_MINUTA_COORDINACION'});
    return version;
  });
}
export async function flujoActual(inicio:string,fin:string){
  const r=await query<any>(`SELECT * FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
  return r[0]||null;
}
export async function publicarMinuta(inicio:string,fin:string,u:string,rol:string){
  if(!['AdminCasino','AdminTotal'].includes(rol)) throw new Error('No tienes autorización para publicar minutas.');
  return inTransaction(async c=>{
    const flujo=await c.query<{id:number;estado:string}>(`SELECT id,estado FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE`,[inicio,fin]);
    const actual=flujo.rows[0];
    if(!actual||actual.estado!=='AUTORIZADA') throw new Error('La última revisión de Coordinación no está autorizada.');
    const minuta=await c.query(`UPDATE minutas SET estado='PUBLICADA' WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 RETURNING id`,[inicio,fin]);
    if(!minuta.rowCount) throw new Error('No existen filas de minuta activas para el período autorizado.');
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='PUBLICADA' WHERE id=$1 AND estado='AUTORIZADA'`,[actual.id]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'PUBLICAR_MINUTA'});
    return minuta.rowCount;
  });
}
