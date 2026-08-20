import { NextResponse } from "next/server"; import { clearSession, getSession } from "@/lib/auth"; import { registrarAcceso } from '@/lib/db/auth';
export async function POST(){ const user=await getSession(); try{if(user) await registrarAcceso(user.username,'LOGOUT');}finally{await clearSession();} return NextResponse.json({ok:true}); }
