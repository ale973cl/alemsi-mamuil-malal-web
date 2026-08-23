'use client';

import { useState } from 'react';

export default function ComprobanteUploader({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string; ok: boolean }>({ loading: false, error: '', ok: false });

  async function upload() {
    if (!file) return setState({ loading: false, error: 'Selecciona un comprobante.', ok: false });
    if (file.size > 10 * 1024 * 1024) return setState({ loading: false, error: 'El archivo supera el máximo de 10 MB.', ok: false });
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return setState({ loading: false, error: 'Formato permitido: PDF, JPG o PNG.', ok: false });

    setState({ loading: true, error: '', ok: false });
    const form = new FormData();
    form.set('file', file);
    const response = await fetch(`/api/comprobante/${encodeURIComponent(token)}`, { method: 'POST', body: form });
    const body = await response.json();
    if (!response.ok) return setState({ loading: false, error: body.error || 'No fue posible cargar el comprobante.', ok: false });
    setState({ loading: false, error: '', ok: true });
  }

  if (state.ok) return <div className="rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-5"><b className="text-[#0E2A23]">✓ Comprobante recibido.</b><p className="mt-1 text-sm text-[#6B7570]">Finanzas lo revisará.</p></div>;

  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#0E2A23]">Carga tu comprobante</h2>
      <p className="mt-1 text-sm text-[#6B7570]">PDF, JPG o PNG · máximo 10 MB.</p>
      <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-[#A6B0AA]/60 bg-white p-6 text-center hover:border-[#1DB954]">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
        <span className="font-bold text-[#0E2A23]">{file ? file.name : 'Seleccionar archivo'}</span>
      </label>
      {state.error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{state.error}</div>}
      <button onClick={upload} disabled={!file || state.loading} className="mt-5 min-h-12 w-full rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] disabled:opacity-40">{state.loading ? 'Enviando…' : 'Enviar comprobante'}</button>
    </div>
  );
}
