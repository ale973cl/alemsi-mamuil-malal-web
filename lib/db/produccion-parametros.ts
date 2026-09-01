import 'server-only';
import { query } from '@/lib/db/pool';

export type ParametrosProduccion={
  margen_produccion_pct:number;
  merma_promedio_pct:number;
  actualizado_por:string|null;
  actualizado_at:string|null;
};

export async function obtenerParametrosProduccion():Promise<ParametrosProduccion>{
  const rows=await query<any>(`SELECT margen_produccion_pct,merma_promedio_pct,actualizado_por,actualizado_at FROM parametros_produccion WHERE id=1 LIMIT 1`);
  const r=rows[0];
  return {
    margen_produccion_pct:Number(r?.margen_produccion_pct||0),
    merma_promedio_pct:Number(r?.merma_promedio_pct||0),
    actualizado_por:r?.actualizado_por?String(r.actualizado_por):null,
    actualizado_at:r?.actualizado_at?String(r.actualizado_at):null,
  };
}

export async function guardarParametrosProduccion(input:{margenProduccionPct:number;mermaPromedioPct:number},usuario:string){
  const margen=Number(input.margenProduccionPct);
  const merma=Number(input.mermaPromedioPct);
  if(!Number.isFinite(margen)||margen<0||margen>100) throw new Error('El margen de producción debe estar entre 0 y 100%.');
  if(!Number.isFinite(merma)||merma<0||merma>=100) throw new Error('La merma promedio debe estar entre 0 y menos de 100%.');
  await query(`INSERT INTO parametros_produccion (id,margen_produccion_pct,merma_promedio_pct,actualizado_por,actualizado_at)
    VALUES (1,$1,$2,$3,NOW())
    ON CONFLICT (id) DO UPDATE SET margen_produccion_pct=EXCLUDED.margen_produccion_pct,merma_promedio_pct=EXCLUDED.merma_promedio_pct,actualizado_por=EXCLUDED.actualizado_por,actualizado_at=NOW()`,[margen,merma,usuario]);
}

export function aplicarMargenRaciones(raciones:number,margenPct:number){
  const base=Math.max(0,Math.trunc(Number(raciones)||0));
  return Math.ceil(base*(1+Math.max(0,Number(margenPct)||0)/100));
}

export function aplicarMermaCantidad(cantidadNeta:number,mermaPct:number){
  const neta=Math.max(0,Number(cantidadNeta)||0);
  const merma=Math.max(0,Number(mermaPct)||0);
  if(merma<=0) return neta;
  if(merma>=100) return neta;
  return neta/(1-merma/100);
}
