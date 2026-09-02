'use client';

import { useFormStatus } from 'react-dom';

export default function ReclamoSubmitButton(){
  const { pending }=useFormStatus();
  return <button
    type="submit"
    disabled={pending}
    aria-disabled={pending}
    className="w-full rounded-xl bg-[#1DB954] p-3 font-black disabled:cursor-not-allowed disabled:opacity-60"
  >
    {pending?'Enviando…':'Enviar'}
  </button>;
}
