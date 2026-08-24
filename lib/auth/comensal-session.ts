import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE='alemsi_comensal';
const MAX_AGE=60*30;
type ComensalSession={rut:string;exp:number};

function secret(){const s=process.env.SESSION_SECRET?.trim();if(!s) throw new Error('SESSION_SECRET no configurada.');return s;}
function sign(body:string){return crypto.createHmac('sha256',secret()).update(body).digest('base64url');}

export async function setComensalSession(rut:string){
  const payload:ComensalSession={rut,exp:Date.now()+MAX_AGE*1000};
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
  (await cookies()).set(COOKIE,`${body}.${sign(body)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:MAX_AGE});
}

export async function getComensalSession({refresh=true}:{refresh?:boolean}={}):Promise<ComensalSession|null>{
  try{
    const jar=await cookies(); const raw=jar.get(COOKIE)?.value; if(!raw) return null;
    const [body,sig]=raw.split('.'); if(!body||!sig) return null;
    const expected=sign(body); const a=Buffer.from(sig); const b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return null;
    const data=JSON.parse(Buffer.from(body,'base64url').toString()) as ComensalSession;
    if(!data.rut||!data.exp||data.exp<Date.now()){jar.delete(COOKIE);return null;}
    if(refresh) await setComensalSession(data.rut);
    return data;
  }catch{return null;}
}

export async function clearComensalSession(){(await cookies()).delete(COOKIE);}
