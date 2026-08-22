import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { verificarTransporteSmtp } from '@/lib/email/smtp';

export const dynamic='force-dynamic';

export async function POST(){
  await requireUser(['AdminTotal']);
  const result=await verificarTransporteSmtp();
  return NextResponse.json(result,{status:result.ok?200:503,headers:{'Cache-Control':'no-store'}});
}
