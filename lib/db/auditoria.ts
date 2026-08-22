import 'server-only';
import type { PoolClient } from 'pg';
import { query } from '@/lib/db/pool';

export type EventoAuditoria={usuario:string;accion:string;fecha?:string};

const sql=`INSERT INTO auditoria_acciones (fecha,usuario,accion) VALUES ($1,$2,$3)`;
const valores=(evento:EventoAuditoria)=>[evento.fecha||new Date().toISOString(),evento.usuario,evento.accion];

export async function registrarAuditoria(evento:EventoAuditoria):Promise<boolean>{
  try{
    await query(sql,valores(evento));
    return true;
  }catch(error){
    console.error('ALEMSI auditoría:',error);
    return false;
  }
}

export async function registrarAuditoriaTx(client:PoolClient,evento:EventoAuditoria):Promise<boolean>{
  await client.query('SAVEPOINT alemsi_auditoria');
  try{
    await client.query(sql,valores(evento));
    await client.query('RELEASE SAVEPOINT alemsi_auditoria');
    return true;
  }catch(error){
    await client.query('ROLLBACK TO SAVEPOINT alemsi_auditoria');
    await client.query('RELEASE SAVEPOINT alemsi_auditoria');
    console.error('ALEMSI auditoría:',error);
    return false;
  }
}
