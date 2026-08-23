import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('el adaptador usa exclusivamente la configuración SMTP confirmada',async()=>{
  const smtp=await source('lib/email/smtp.ts');
  for(const variable of ['SMTP_SERVER','SMTP_PORT','EMAIL_USER','EMAIL_PASS']) assert.match(smtp,new RegExp(`process\\.env\\.${variable}`));
  assert.doesNotMatch(smtp,/NEXT_PUBLIC_|DATABASE_URL|SESSION_SECRET/);
  assert.match(smtp,/STARTTLS/);
  assert.match(smtp,/minVersion:'TLSv1\.2'/);
  assert.match(smtp,/rejectUnauthorized:true/);
  assert.match(smtp,/EMAIL_PASS\?\.replace\(\/\\s\+\/g,''\)/);
});

test('la verificación autentica sin enviar mensajes ni registrar secretos',async()=>{
  const smtp=await source('lib/email/smtp.ts');
  const start=smtp.indexOf('export async function verificarTransporteSmtp');
  const end=smtp.indexOf('export async function enviarCorreoSmtp');
  assert.ok(start>=0&&end>start,'deben existir verificador y función de envío separadas');
  const verify=smtp.slice(start,end);
  assert.doesNotMatch(verify,/\bMAIL FROM\b|\bRCPT TO\b|\bDATA\b/);
  assert.doesNotMatch(smtp,/console\.|EMAIL_PASS.*(?:log|error)/);
  assert.match(verify,/SMTP CONNECTED \/ AUTH OK/);
  assert.match(smtp,/export async function enviarCorreoSmtp/);
  for(const kind of ['configuration','connection','tls','authentication','timeout','protocol']) assert.match(smtp,new RegExp(`'${kind}'`));
});

test('la prueba remota es server-only, no cacheable y exclusiva de AdminTotal',async()=>{
  const [smtp,route]=await Promise.all([source('lib/email/smtp.ts'),source('app/api/admin/smtp/verify/route.ts')]);
  assert.match(smtp,/import 'server-only'/);
  assert.match(route,/requireUser\(\['AdminTotal'\]\)/);
  assert.match(route,/export async function POST/);
  assert.match(route,/Cache-Control':'no-store/);
  assert.doesNotMatch(route,/EMAIL_PASS|EMAIL_USER/);
});
