import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';

export type RolReclamo='AdminCasino'|'AdminTotal'|'Coordinacion'|'Gerencia'|'Finanzas';
export const AREAS_RECLAMOS=[
  {key:'ADMIN_CASINO',nombre:'Administración Casino',rol:'AdminCasino'},
  {key:'CASINO',nombre:'Casino',rol:'Casino'},
  {key:'COORDINACION',nombre:'Coordinación',rol:'Coordinacion'},
  {key:'FINANZAS',nombre:'Finanzas',rol:'Finanzas'},
  {key:'GERENCIA',nombre:'Gerencia',rol:'Gerencia'},
  {key:'COCINA',nombre:'Cocina',rol:'Cocina'},
] as const;
export const CATEGORIAS_RECLAMOS=[
  {key:'COMIDA_SERVICIO',nombre:'Comida / Servicio'},
  {key:'PREPARACION_ALIMENTACION',nombre:'Preparación / Alimentación'},
  {key:'PAGO_DEUDA',nombre:'Pago / Deuda'},
  {key:'OTROS_SUGERENCIAS',nombre:'Otros / Sugerencias'},
] as const;

export async function obtenerConfiguracionReclamos(){
  const [responsables,permisos]=await Promise.all([
    query<any>(`SELECT area_key,area_nombre,rol,responsable,correo,activo,actualizado_at,actualizado_por FROM reclamo_areas_responsables ORDER BY orden,area_nombre`),
    query<any>(`SELECT categoria_key,area_key,puede_ver,puede_solucionar FROM reclamo_permisos ORDER BY categoria_key,area_key`),
  ]);
  return {responsables,permisos};
}

export async function guardarResponsableReclamo(input:{areaKey:string;responsable:string;correo:string;activo:boolean},usuario:string){
  const area=AREAS_RECLAMOS.find(item=>item.key===input.areaKey);
  if(!area) throw new Error('Área de reclamos inválida.');
  const correo=input.correo.trim().toLowerCase();
  if(correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Correo inválido.');
  await inTransaction(async c=>{
    await c.query(`INSERT INTO reclamo_areas_responsables (area_key,area_nombre,rol,responsable,correo,activo,orden,actualizado_at,actualizado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
      ON CONFLICT (area_key) DO UPDATE SET area_nombre=EXCLUDED.area_nombre,rol=EXCLUDED.rol,responsable=EXCLUDED.responsable,correo=EXCLUDED.correo,activo=EXCLUDED.activo,orden=EXCLUDED.orden,actualizado_at=NOW(),actualizado_por=EXCLUDED.actualizado_por`,
      [area.key,area.nombre,area.rol,input.responsable.trim(),correo,input.activo,AREAS_RECLAMOS.indexOf(area)+1,usuario]);
    await registrarAuditoriaTx(c,{usuario,accion:'ACTUALIZAR_RESPONSABLE_RECLAMOS'});
  });
}

export async function guardarPermisosReclamos(permisos:Array<{categoriaKey:string;areaKey:string;puedeVer:boolean;puedeSolucionar:boolean}>,usuario:string){
  const validos=permisos.filter(item=>CATEGORIAS_RECLAMOS.some(c=>c.key===item.categoriaKey)&&AREAS_RECLAMOS.some(a=>a.key===item.areaKey));
  if(validos.length!==CATEGORIAS_RECLAMOS.length*AREAS_RECLAMOS.length) throw new Error('La matriz de permisos está incompleta.');
  await inTransaction(async c=>{
    await c.query(`INSERT INTO reclamo_permisos (categoria_key,area_key,puede_ver,puede_solucionar,actualizado_at,actualizado_por)
      SELECT x.categoria_key,x.area_key,x.puede_ver,x.puede_solucionar,NOW(),$2
      FROM jsonb_to_recordset($1::jsonb) AS x(categoria_key text,area_key text,puede_ver boolean,puede_solucionar boolean)
      ON CONFLICT (categoria_key,area_key) DO UPDATE SET puede_ver=EXCLUDED.puede_ver,puede_solucionar=EXCLUDED.puede_solucionar,actualizado_at=NOW(),actualizado_por=EXCLUDED.actualizado_por`,
      [JSON.stringify(validos.map(item=>({categoria_key:item.categoriaKey,area_key:item.areaKey,puede_ver:item.puedeVer,puede_solucionar:item.puedeSolucionar}))),usuario]);
    await registrarAuditoriaTx(c,{usuario,accion:'ACTUALIZAR_PERMISOS_RECLAMOS'});
  });
}

export async function listarReclamosParaRol(rol:RolReclamo,pagina=1,tamano=25){
  const limite=Math.min(50,Math.max(1,Math.trunc(tamano)||25));
  const offset=(Math.max(1,Math.trunc(pagina)||1)-1)*limite;
  const filtro=rol==='AdminCasino'||rol==='AdminTotal'
    ? ''
    : `AND (COALESCE(r.area_actual,'AdminCasino')=$1 OR EXISTS (SELECT 1 FROM reclamo_movimientos m WHERE m.reclamo_id=r.id AND m.destino_rol=$1))`;
  return query<any>(
    `SELECT r.id,r.rut,r.nombre,r.tipo,r.categoria,r.mensaje,r.fecha,r.estado,
            COALESCE(r.area_actual,'AdminCasino') area_actual,r.actualizado_por,r.fecha_actualizacion
       FROM reclamos_sugerencias r
      WHERE 1=1 ${filtro}
      ORDER BY CASE WHEN r.estado='Cerrado' THEN 1 ELSE 0 END,r.id DESC
      LIMIT $${rol==='AdminCasino'||rol==='AdminTotal'?1:2} OFFSET $${rol==='AdminCasino'||rol==='AdminTotal'?2:3}`,
    rol==='AdminCasino'||rol==='AdminTotal'?[limite,offset]:[rol,limite,offset],
  );
}

export async function obtenerDetalleReclamo(id:number){
  const rows=await query<any>(`SELECT r.id,r.rut,r.nombre,r.tipo,r.categoria,r.mensaje,r.fecha,r.estado,
    COALESCE(r.area_actual,'AdminCasino') area_actual,r.actualizado_por,r.fecha_actualizacion,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',m.id,'actor',m.actor,'actor_rol',m.actor_rol,'accion',m.accion,'destino_rol',m.destino_rol,'mensaje',m.mensaje,'estado',m.estado_resultante,'fecha',m.fecha) ORDER BY m.id) FROM reclamo_movimientos m WHERE m.reclamo_id=r.id),'[]'::json) movimientos,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',a.id,'movimiento_id',a.movimiento_id,'nombre',a.nombre_archivo,'mime',a.mime_type,'cargado_por',a.cargado_por,'cargado_rol',a.cargado_rol,'fecha',a.fecha_carga) ORDER BY a.id) FROM reclamo_adjuntos a WHERE a.reclamo_id=r.id),'[]'::json) adjuntos
    FROM reclamos_sugerencias r WHERE r.id=$1 LIMIT 1`,[id]);
  return rows[0]||null;
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
