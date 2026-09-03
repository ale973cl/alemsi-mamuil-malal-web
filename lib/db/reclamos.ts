import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';

export type RolReclamo='AdminCasino'|'AdminTotal'|'Coordinacion'|'Gerencia'|'Finanzas';

export async function listarReclamosParaRol(_rol:RolReclamo){
  // Los perfiles autorizados comparten una ficha única. La matriz determina quién
  // gestiona/recibe el caso, pero no debe ocultar el expediente a Gerencia,
  // Coordinación o Finanzas cuando el usuario ya tiene permiso de Reclamos.
  return query<any>(
    `SELECT r.id,r.rut,r.nombre,r.tipo,r.categoria,r.mensaje,r.fecha,r.estado,
            c.telefono,c.correo,c.institucion,
            COALESCE(r.area_actual,'AdminCasino') area_actual,r.actualizado_por,r.fecha_actualizacion,
            COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',m.id,'actor',m.actor,'actor_rol',m.actor_rol,'accion',m.accion,'destino_rol',m.destino_rol,'mensaje',m.mensaje,'estado',m.estado_resultante,'fecha',m.fecha) ORDER BY m.id) FROM reclamo_movimientos m WHERE m.reclamo_id=r.id),'[]'::json) movimientos,
            COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',a.id,'movimiento_id',a.movimiento_id,'nombre',a.nombre_archivo,'mime',a.mime_type,'cargado_por',a.cargado_por,'cargado_rol',a.cargado_rol,'fecha',a.fecha_carga) ORDER BY a.id) FROM reclamo_adjuntos a WHERE a.reclamo_id=r.id),'[]'::json) adjuntos
       FROM reclamos_sugerencias r
       LEFT JOIN comensales c ON c.rut=r.rut
      ORDER BY CASE WHEN r.estado='Cerrado' THEN 1 ELSE 0 END,r.id DESC
      LIMIT 200`,
  );
}

export async function agregarMovimientoReclamo(input:{reclamoId:number;actor:string;actorRol:RolReclamo;accion:string;destinoRol?:RolReclamo|null;mensaje?:string;estado?:string;archivo?:{nombre:string;mime:string;bytes:Uint8Array}|null}){
  if(!input.reclamoId) throw new Error('Reclamo inválido.');
  const ahora=new Date().toISOString();
  const destino=input.destinoRol||null;
  const estado=input.estado||null;
  await inTransaction(async c=>{
    const caso=await c.query<{id:number}>(`SELECT id FROM reclamos_sugerencias WHERE id=$1 FOR UPDATE`,[input.reclamoId]);
    if(!caso.rows[0]) throw new Error('Reclamo no encontrado.');
    const mov=await c.query<{id:number}>(
      `INSERT INTO reclamo_movimientos (reclamo_id,actor,actor_rol,accion,destino_rol,mensaje,estado_resultante,fecha)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [input.reclamoId,input.actor,input.actorRol,input.accion,destino,input.mensaje?.trim()||null,estado,ahora],
    );
    await c.query(
      `UPDATE reclamos_sugerencias
          SET estado=COALESCE($1,estado),area_actual=COALESCE($2,area_actual,'AdminCasino'),actualizado_por=$3,fecha_actualizacion=$4
        WHERE id=$5`,
      [estado,destino,input.actor,ahora,input.reclamoId],
    );
    if(input.archivo){
      await c.query(
        `INSERT INTO reclamo_adjuntos (reclamo_id,movimiento_id,nombre_archivo,mime_type,contenido,cargado_por,cargado_rol,fecha_carga)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [input.reclamoId,mov.rows[0].id,input.archivo.nombre,input.archivo.mime,Buffer.from(input.archivo.bytes),input.actor,input.actorRol,ahora],
      );
    }
  });
}

export async function agregarAdjuntoInicial(input:{reclamoId:number;actor:string;nombre:string;mime:string;bytes:Uint8Array}){
  const ahora=new Date().toISOString();
  await query(
    `INSERT INTO reclamo_adjuntos (reclamo_id,movimiento_id,nombre_archivo,mime_type,contenido,cargado_por,cargado_rol,fecha_carga)
     VALUES ($1,NULL,$2,$3,$4,$5,'Comensal',$6)`,
    [input.reclamoId,input.nombre,input.mime,Buffer.from(input.bytes),input.actor,ahora],
  );
}

export async function obtenerAdjuntoReclamo(id:number){
  const rows=await query<{id:number;reclamo_id:number;nombre_archivo:string;mime_type:string;contenido:Buffer}>(
    `SELECT id,reclamo_id,nombre_archivo,mime_type,contenido FROM reclamo_adjuntos WHERE id=$1 LIMIT 1`,[id]);
  return rows[0]||null;
}

export async function listarReclamosComensal(rut:string){
  return query<{
    id:number;tipo:string;categoria:string;mensaje:string;fecha:string;estado:string;
  }>(
    `SELECT id,tipo,categoria,mensaje,fecha,estado
       FROM reclamos_sugerencias
      WHERE rut=$1
      ORDER BY id DESC
      LIMIT 20`,
    [rut],
  );
}
