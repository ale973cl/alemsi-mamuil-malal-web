import { correoHtmlAlemzinChefPrueba } from '@/lib/email/alemzin-chef-layout';

export default function AlemzinChefEmailPreview(){
  const html=correoHtmlAlemzinChefPrueba('Reserva confirmada',`
    <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#42515a">Hola <b>Comensal de prueba</b>, tu reserva fue registrada correctamente.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">
      <tr><td style="padding:8px;color:#5b6670;width:38%">Código de reserva</td><td style="padding:8px;font-weight:800;color:#0B2D5B">MM-DEMO-001</td></tr>
      <tr><td style="padding:8px;color:#5b6670">Servicio</td><td style="padding:8px;font-weight:700">Almuerzo</td></tr>
      <tr><td style="padding:8px;color:#5b6670">Plato</td><td style="padding:8px;font-weight:700">Opción 1</td></tr>
      <tr><td style="padding:8px;color:#5b6670">Monto</td><td style="padding:8px;font-size:18px;font-weight:800;color:#087A46">$0</td></tr>
    </table>
    <div style="margin-top:20px;font-weight:800;color:#0B2D5B">Datos para transferencia</div>
    <div style="margin-top:8px;padding:14px 16px;background:#eef7f6;border:1px solid #cfe5df;border-radius:8px;font-size:13px;line-height:1.55;color:#24434a">En producción, este bloque se alimenta desde <b>configuracion_bancaria</b>. Esta página no usa datos reales.</div>
    <div style="margin-top:22px;text-align:center"><span style="display:inline-block;background:#0D9B91;color:white;font-weight:800;padding:12px 18px;border-radius:8px">Subir comprobante de pago</span></div>
  `);
  return <main style={{minHeight:'100vh',background:'#e9efec',padding:'20px 8px'}}><div dangerouslySetInnerHTML={{__html:html}} /></main>;
}
