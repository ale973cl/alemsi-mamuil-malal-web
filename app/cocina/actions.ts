'use server';
import { requireUser } from '@/lib/auth/session';
import { cerrarJornada, iniciarJornada } from '@/lib/db/cocina';
import { revalidatePath } from 'next/cache';

export async function iniciarAction(fd: FormData) {
  const u = await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const fecha = String(fd.get('fecha') || '');
  if (fd.get('confirmacion') !== 'on') throw new Error('Debes confirmar el inicio de jornada.');
  await iniciarJornada(fecha, u.username);
  revalidatePath('/cocina');
}

export async function cerrarAction(fd: FormData) {
  const u = await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const fecha = String(fd.get('fecha') || '');
  if (fd.get('confirmacion') !== 'on') throw new Error('Debes confirmar el cierre de jornada.');
  const raw = String(fd.get('items') || '[]');
  const parsed = JSON.parse(raw) as Array<{id:number;reservadas:number;producidas:number|null;entregadas:number|null;motivo:string}>;
  const items = parsed.map((item) => {
    if (item.producidas === null || item.entregadas === null) {
      throw new Error('Debes ingresar las cantidades producidas y entregadas antes de cerrar la jornada.');
    }
    const producidas = Number(item.producidas);
    const entregadas = Number(item.entregadas);
    const reservadas = Number(item.reservadas);
    if (![producidas, entregadas, reservadas].every(Number.isFinite) || producidas < 0 || entregadas < 0 || reservadas < 0) {
      throw new Error('Las cantidades de producción deben ser números válidos mayores o iguales a cero.');
    }
    return { id:Number(item.id), reservadas, producidas, entregadas, motivo:String(item.motivo || '') };
  });
  await cerrarJornada(fecha, u.username, String(fd.get('novedades') || ''), items);
  revalidatePath('/cocina');
}
