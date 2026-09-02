'use client';

import { useFormStatus } from 'react-dom';

export default function FinanzasSubmitButton({
  children,
  pendingLabel='Procesando…',
  className,
}:{
  children:React.ReactNode;
  pendingLabel?:string;
  className:string;
}){
  const {pending}=useFormStatus();
  return <button
    type="submit"
    disabled={pending}
    aria-disabled={pending}
    aria-live="polite"
    className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
  >
    {pending?pendingLabel:children}
  </button>;
}
