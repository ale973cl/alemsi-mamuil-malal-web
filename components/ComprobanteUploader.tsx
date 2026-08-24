'use client';

import { useState } from 'react';

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

async function prepararArchivo(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return file;
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No fue posible preparar la imagen.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
  if (!blob) throw new Error('No fue posible comprimir la imagen.');
  const base = file.name.replace(/\.[^.]+$/, '') || 'comprobante';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export default function ComprobanteUploader({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string; ok: boolean }>({ loading: false, error: '', ok: false });

  async function upload() {
    if (!file) return setState({ loading: false, error: 'Selecciona un comprobante.', ok: false });
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return setState({ loading: false, error: 'Formato permitido: PDF, JPG o PNG.', ok: false });

    setState({ loading: true, error: '', ok: false });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const preparado = await prepararArchivo(file);
      if (preparado.size > MAX_UPLOAD_BYTES) {
        return setState({ loading: false, error: 'El archivo sigue siendo demasiado pesado. Usa un PDF o imagen de hasta 3,5 MB.', ok: false });
      }
      const form = new FormData();
      form.set('file', preparado);
      const response = await fetch(`/api/comprobante/${encodeURIComponent(token)}`, { method: 'POST', body: form, signal: controller.signal });
      const text = await response.text();
      let body: { error?: string } = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
      if (!response.ok) return setState({ loading: false, error: body.error || `No fue posible cargar el comprobante (${response.status}).`, ok: false });
      setState({ loading: false, error: '', ok: true });
    } catch (error) {
      const mensaje = error instanceof DOMException && error.name === 'AbortError'
        ? 'La carga tardó demasiado. Revisa tu conexión y vuelve a intentar.'
        : error instanceof Error ? error.message : 'No fue posible cargar el comprobante.';
      setState({ loading: false, error: mensaje, ok: false });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (state.ok) return <div className="rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-5"><b className="text-[#0E2A23]">✓ Comprobante recibido.</b><p className="mt-1 text-sm text-[#6B7570]">Finanzas lo revisará.</p></div>;

  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#0E2A23]">Carga tu comprobante</h2>
      <p className="mt-1 text-sm text-[#6B7570]">PDF, JPG o PNG. Las fotos del teléfono se optimizan automáticamente antes de enviar.</p>
      <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-[#A6B0AA]/60 bg-white p-6 text-center hover:border-[#1DB954]">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
        <span className="font-bold text-[#0E2A23]">{file ? file.name : 'Seleccionar archivo'}</span>
      </label>
      {state.error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{state.error}</div>}
      <button onClick={upload} disabled={!file || state.loading} className="mt-5 min-h-12 w-full rounded-xl bg-[#1DB954] px-6 font-extrabold text-[#071814] disabled:opacity-40">{state.loading ? 'Enviando…' : 'Enviar comprobante'}</button>
    </div>
  );
}
