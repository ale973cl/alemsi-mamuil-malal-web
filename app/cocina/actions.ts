'use server';
import { requireUser } from '@/lib/auth/session';
import { cerrarJornada, iniciarJornada } from '@/lib/db/cocina';
import { revalidatePath } from 'next/cache';

export async function iniciarAction(fd: FormData) {
  const u = await requireUser(['Cocina','AdminCasino','AdminTotal','Bodega']);
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
  const items = JSON.parse(raw) as Array<{id:number;reservadas:number;producidas:number;entregadas:number;motivo:string}>;
  await cerrarJornada(fecha, u.username, String(fd.get('novedades') || ''), items);
  revalidatePath('/cocina');
}
