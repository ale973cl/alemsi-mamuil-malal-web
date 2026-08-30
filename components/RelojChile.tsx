'use client';
import { useEffect,useState } from 'react';
import { fechaHoraVisibleChile,ZONA_CHILE } from '@/lib/fecha-hora';

export default function RelojChile({epochServidor}:{epochServidor:number}){
  const [epoch,setEpoch]=useState(epochServidor);
  useEffect(()=>{const inicio=Date.now();const timer=setInterval(()=>setEpoch(epochServidor+Date.now()-inicio),1000);return()=>clearInterval(timer)},[epochServidor]);
  return <div className="rounded-xl border border-[#0D9B91]/30 bg-[#EEF7F6] px-3 py-2 text-xs text-[#0E2A23]"><b>HORA OFICIAL DEL SISTEMA — CHILE</b><div className="font-mono text-sm font-black">{fechaHoraVisibleChile(new Date(epoch))}</div><div>{ZONA_CHILE}</div></div>;
}
