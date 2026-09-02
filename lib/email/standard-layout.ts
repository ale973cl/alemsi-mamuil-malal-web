import 'server-only';

export function escCorreo(v:unknown){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
}

export function correoHtmlEstandar(title:string,content:string,eyebrow='CASINO MAMUIL',_headerHtml=''){
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#14232d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f5;padding:0 10px 24px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden"><tr><td style="padding:24px"><div style="font-size:12px;line-height:18px;font-weight:800;color:#087A46;margin-bottom:6px">${escCorreo(eyebrow)}</div><div style="font-size:22px;font-weight:800;color:#0B2D5B;margin-bottom:18px">${escCorreo(title)}</div>${content}</td></tr><tr><td style="border-top:1px solid #d7e1dc;padding:14px 24px;font-size:11px;color:#6b7570">ALEMSI · Casino Mamuil Malal · Alimentamos bien, cuidamos a las personas.</td></tr></table></td></tr></table></body></html>`;
}

export function correoHtmlDesdeTexto(title:string,text:string){
  const paragraphs=String(text||'').split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#42515a">${escCorreo(p).replace(/\n/g,'<br>')}</p>`).join('');
  return correoHtmlEstandar(title,paragraphs||'<p style="font-size:14px;color:#42515a">Mensaje ALEMSI.</p>');
}
