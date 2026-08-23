import { NextResponse } from "next/server";
import { authenticate, setSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
export async function POST(req:Request){
  try{ const body=await req.json(); const user=await authenticate(String(body.username||""),String(body.password||"")); if(!user)return NextResponse.json({ok:false,error:"Usuario o contraseña no válidos, o cuenta deshabilitada."},{status:401}); await setSession(user); return NextResponse.json({ok:true,user,redirect:ROLE_HOME[user.role]||"/portal"}); }
  catch(e){ console.error(e); return NextResponse.json({ok:false,error:"No fue posible iniciar sesión."},{status:500}); }
}
