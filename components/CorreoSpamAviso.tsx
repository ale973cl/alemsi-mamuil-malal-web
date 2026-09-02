export default function CorreoSpamAviso({className=''}:{className?:string}){
  return <div className={`rounded-xl border border-[#D4AF37]/50 bg-[#FFF8E8] p-3 text-left text-sm text-[#5C4715] ${className}`.trim()}>
    <b>¿No encuentras el correo?</b> Revisa la carpeta <b>Spam</b> o <b>Correo no deseado</b>. Si aparece allí, ábrelo y márcalo como <b>“No es spam”</b> para recibir correctamente los próximos avisos de ALEMSI.
  </div>;
}
