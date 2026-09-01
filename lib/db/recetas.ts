import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
import { ESTADO_MINUTA_PUBLICADA } from '@/lib/reglas/reserva';

export type IngredienteReceta={id?:number;ingrediente:string;cantidad:number;unidad:string;orden:number};
export type RecetaEstandar={id:number;plato:string;porciones_base:number;preparacion:string;activo:boolean;margen_produccion_pct:number;merma_pct:number;ingredientes:IngredienteReceta[]};
export type PlatoMaestro={plato:string;origen:'MINUTA'|'RECETA';receta_id:number|null;activo:boolean|null};

export async function listarRecetas():Promise<RecetaEstandar[]>{
  const rows=await query<any>(`SELECT r.id,r.plato,r.porciones_base,r.preparacion,r.activo,r.margen_produccion_pct,r.merma_pct,
    COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id',i.id,'ingrediente',i.ingrediente,'cantidad',i.cantidad,'unidad',i.unidad,'orden',i.orden) ORDER BY i.orden,i.id) FILTER (WHERE i.id IS NOT NULL),'[]'::json) ingredientes
    FROM recetas_estandar r LEFT JOIN receta_ingredientes i ON i.receta_id=r.id
    GROUP BY r.id,r.plato,r.porciones_base,r.preparacion,r.activo,r.margen_produccion_pct,r.merma_pct
    ORDER BY r.activo DESC,r.plato`);
  return rows.map((r:any)=>({...r,porciones_base:Number(r.porciones_base),margen_produccion_pct:Number(r.margen_produccion_pct||0),merma_pct:Number(r.merma_pct||0),ingredientes:(r.ingredientes||[]).map((i:any)=>({...i,cantidad:Number(i.cantidad),orden:Number(i.orden)}))}));
}

export async function listarPlatosMaestro():Promise<PlatoMaestro[]>{
  const [minutas,recetas]=await Promise.all([
    query<{plato:string}>(`SELECT DISTINCT TRIM(plato) plato FROM minutas WHERE activo=1 AND estado=$1 AND TRIM(COALESCE(plato,''))<>'' ORDER BY TRIM(plato)`,[ESTADO_MINUTA_PUBLICADA]),
    query<{id:number;plato:string;activo:boolean}>(`SELECT id,TRIM(plato) plato,activo FROM recetas_estandar WHERE TRIM(COALESCE(plato,''))<>'' ORDER BY TRIM(plato)`),
  ]);
  const porNombre=new Map<string,PlatoMaestro>();
  for(const r of minutas){const key=r.plato.toLocaleLowerCase('es-CL');porNombre.set(key,{plato:r.plato,origen:'MINUTA',receta_id:null,activo:null});}
  for(const r of recetas){const key=r.plato.toLocaleLowerCase('es-CL');porNombre.set(key,{plato:r.plato,origen:porNombre.has(key)?'MINUTA':'RECETA',receta_id:r.id,activo:Boolean(r.activo)});}
  return [...porNombre.values()].sort((a,b)=>a.plato.localeCompare(b.plato,'es'));
}

export async function obtenerReceta(id:number):Promise<RecetaEstandar|null>{
  const rows=await listarRecetas();
  return rows.find(r=>r.id===id)||null;
}

export async function guardarReceta(input:{id?:number;plato:string;porcionesBase:number;preparacion:string;activo:boolean;margenProduccionPct:number;mermaPct:number;ingredientes:Array<{ingrediente:string;cantidad:number;unidad:string}>},usuario:string){
  const plato=input.plato.trim();
  const preparacion=input.preparacion.trim();
  const porciones=Math.trunc(Number(input.porcionesBase));
  const margen=Number(input.margenProduccionPct);
  const merma=Number(input.mermaPct);
  const ingredientes=input.ingredientes.map((i,index)=>({ingrediente:i.ingrediente.trim(),cantidad:Number(i.cantidad),unidad:i.unidad.trim(),orden:index})).filter(i=>i.ingrediente&&Number.isFinite(i.cantidad)&&i.cantidad>=0);
  if(!plato) throw new Error('Indica el nombre del plato.');
  if(!preparacion) throw new Error('Indica la preparación de la receta.');
  if(!Number.isFinite(porciones)||porciones<=0) throw new Error('Las porciones base deben ser mayores que cero.');
  if(!Number.isFinite(margen)||margen<0||margen>100) throw new Error('El margen de producción debe estar entre 0 y 100%.');
  if(!Number.isFinite(merma)||merma<0||merma>=100) throw new Error('La merma debe estar entre 0 y menos de 100%.');
  if(!ingredientes.length) throw new Error('Agrega al menos un ingrediente con cantidad.');
  return inTransaction(async c=>{
    let recetaId=Number(input.id||0);
    if(!recetaId){
      const existente=await c.query<{id:number}>(`SELECT id FROM recetas_estandar WHERE LOWER(TRIM(plato))=LOWER(TRIM($1)) LIMIT 1`,[plato]);
      recetaId=Number(existente.rows[0]?.id||0);
    }
    if(recetaId){
      const updated=await c.query<{id:number}>(`UPDATE recetas_estandar SET plato=$1,porciones_base=$2,preparacion=$3,activo=$4,margen_produccion_pct=$5,merma_pct=$6,actualizado_por=$7,actualizado_at=NOW() WHERE id=$8 RETURNING id`,[plato,porciones,preparacion,input.activo,margen,merma,usuario,recetaId]);
      if(!updated.rows[0]) throw new Error('Receta no encontrada.');
    }else{
      const inserted=await c.query<{id:number}>(`INSERT INTO recetas_estandar (plato,porciones_base,preparacion,activo,margen_produccion_pct,merma_pct,creado_por,actualizado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,[plato,porciones,preparacion,input.activo,margen,merma,usuario]);
      recetaId=inserted.rows[0].id;
    }
    await c.query(`DELETE FROM receta_ingredientes WHERE receta_id=$1`,[recetaId]);
    for(const item of ingredientes){
      await c.query(`INSERT INTO receta_ingredientes (receta_id,ingrediente,cantidad,unidad,orden) VALUES ($1,$2,$3,$4,$5)`,[recetaId,item.ingrediente,item.cantidad,item.unidad,item.orden]);
    }
    await registrarAuditoriaTx(c,{usuario,accion:'GUARDAR_RECETA_ESTANDAR'});
    return recetaId;
  });
}
