import AppShell from '@/components/AppShell';
import ReclamosExpedientes from '@/components/ReclamosExpedientes';
import { requireUser } from '@/lib/auth/session';

export const dynamic='force-dynamic';

export default async function Page(){
  const u=await requireUser(['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas']);
  return <AppShell user={u}><div className="space-y-5"><section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">EXPEDIENTE COMPARTIDO</p><h1 className="text-2xl font-black">Reclamos y seguimiento</h1><p className="mt-1 text-sm text-[#6B7570]">Admin Casino, Coordinación, Gerencia y Finanzas trabajan sobre el mismo folio, sin duplicar casos.</p></section><ReclamosExpedientes user={u}/></div></AppShell>;
}
