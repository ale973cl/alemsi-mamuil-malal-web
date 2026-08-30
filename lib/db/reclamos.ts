import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';

async function asegurarGestionReclamos(){
  await inTransaction(async c=>{
    await c.query(`CREATE TABLE IF NOT EXISTS reclamo_responsables (
      categoria TEXT PRIMARY KEY,responsable TEXT NOT NULL,correo TEXT NOT NULL,
      actualizado_por TEXT,actualizado_at TEXT)`);
    await c.query(`CREATE TABLE IF NOT EXISTS reclamo_movimientos (
      id SERIAL PRIMARY KEY,reclamo_id INTEGER NOT NULL,actor TEXT NOT NULL,actor_rol TEXT NOT NULL,
      accion TEXT NOT NULL,destino_rol TEXT,mensaje TEXT,estado_resultante TEXT,fecha TEXT NOT NULL)`);
    await c.query(`CREATE TABLE IF NOT EXISTS reclamo_adjuntos (
      id SERIAL PRIMARY KEY,reclamo_id INTEGER NOT NULL,movimiento_id INTEGER,nombre_archivo TEXT NOT NULL,
      mime_type TEXT NOT NULL,contenido BYTEA NOT NULL,cargado_por TEXT,cargado_rol TEXT,fecha_carga TEXT)`);
    await c.query(`ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS area_actual TEXT DEFAULT 'AdminCasino'`);
    await c.query(`ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS actualizado_por TEXT`);
    await c.query(`ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS fecha_actualizacion TEXT`);
  });
}

export type RolReclamo='AdminCasino'|'AdminTotal'|'Coordinacion'|'Gerencia'|'Finanzas';

export async function listarReclamosParaRol(rol:RolReclamo){
  await asegurarGestionReclamos();
  const filtro=rol==='AdminCasino'||rol==='AdminTotal'
    ? ''
    : `AND (COALESCE(r.area_actual,'AdminCasino')=$1 OR EXISTS (SELECT 1 FROM reclamo_movimientos m WHERE m.reclamo_id=r.id AND m.destino_rol=$1))`;
  return query<any>(
    `SELECT r.id,r.rut,r.nombre,r.tipo,r.categoria,r.mensaje,r.fecha,r.estado,
            COALESCE(r.area_actual,'AdminCasino') area_actual,r.actualizado_por,r.fecha_actualizacion,
            COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',m.id,'actor',m.actor,'actor_rol',m.actor_rol,'accion',m.accion,'destino_rol',m.destino_rol,'mensaje',m.mensaje,'estado',m.estado_resultante,'fecha',m.fecha) ORDER BY m.id) FROM reclamo_movimientos m WHERE m.reclamo_id=r.id),'[]'::json) movimientos,
            COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',a.id,'movimiento_id',a.movimiento_id,'nombre',a.nombre_archivo,'mime',a.mime_type,'cargado_por',a.cargado_por,'cargado_rol',a.cargado_rol,'fecha',a.fecha_carga) ORDER BY a.id) FROM reclamo_adjuntos a WHERE a.reclamo_id=r.id),'[]'::json) adjuntos
       FROM reclamos_sugerencias r
      WHERE 1=1 ${filtro}
      ORDER BY CASE WHEN r.estado='Cerrado' THEN 1 ELSE 0 END,r.id DESC
      LIMIT 100`,
    rol==='AdminCasino'||rol==='AdminTotal'?[]:[rol],
  );
}

export async function agregarMovimientoReclamo(input:{reclamoId:number;actor:string;actorRol:RolReclamo;accion:string;destinoRol?:RolReclamo|null;mensaje?:string;estado?:string;archivo?:{nombre:string;mime:string;bytes:Uint8Array}|null}){
  await asegurarGestionReclamos();
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
  await asegurarGestionReclamos();
  const ahora=new Date().toISOString();
  await query(
    `INSERT INTO reclamo_adjuntos (reclamo_id,movimiento_id,nombre_archivo,mime_type,contenido,cargado_por,cargado_rol,fecha_carga)
     VALUES ($1,NULL,$2,$3,$4,$5,'Comensal',$6)`,
    [input.reclamoId,input.nombre,input.mime,Buffer.from(input.bytes),input.actor,ahora],
  );
}

export async function obtenerAdjuntoReclamo(id:number){
  await asegurarGestionReclamos();
  const rows=await query<{id:number;reclamo_id:number;nombre_archivo:string;mime_type:string;contenido:Buffer}>(
    `SELECT id,reclamo_id,nombre_archivo,mime_type,contenido FROM reclamo_adjuntos WHERE id=$1 LIMIT 1`,[id]);
  return rows[0]||null;
}

export async function listarResponsablesReclamos(){
  await asegurarGestionReclamos();
  return query<{categoria:string;responsable:string;correo:string}>(`SELECT categoria,responsable,correo FROM reclamo_responsables ORDER BY categoria`);
}

export async function guardarResponsableReclamo(input:{categoria:string;responsable:string;correo:string;usuario:string}){
  await asegurarGestionReclamos();
  if(!input.categoria.trim()||!input.responsable.trim()) throw new Error('Categoría y responsable son obligatorios.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo.trim())) throw new Error('Ingresa un correo válido.');
  await query(`INSERT INTO reclamo_responsables (categoria,responsable,correo,actualizado_por,actualizado_at)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (categoria) DO UPDATE SET responsable=EXCLUDED.responsable,
    correo=EXCLUDED.correo,actualizado_por=EXCLUDED.actualizado_por,actualizado_at=EXCLUDED.actualizado_at`,
    [input.categoria.trim(),input.responsable.trim(),input.correo.trim().toLowerCase(),input.usuario,new Date().toISOString()]);
}

export async function obtenerCorreoResponsableReclamo(categoria:string){
  await asegurarGestionReclamos();
  const rows=await query<{correo:string}>(`SELECT correo FROM reclamo_responsables WHERE LOWER(TRIM(categoria))=LOWER(TRIM($1)) LIMIT 1`,[categoria]);
  return String(rows[0]?.correo||'').trim();
}

export async function resumenReclamosJornada(fecha:string){
  await asegurarGestionReclamos();
  return query<any>(`SELECT COALESCE(estado,'Pendiente') estado,COUNT(*)::int cantidad
    FROM reclamos_sugerencias WHERE LEFT(fecha,10)=$1 GROUP BY COALESCE(estado,'Pendiente') ORDER BY estado`,[fecha]);
}
