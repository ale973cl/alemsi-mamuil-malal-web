import Link from "next/link";
export default function ModuleCard({name,label,description}:{name:string,label:string,description:string}){return <Link className="moduleCard" href={`/portal?modulo=${name}`}><span className="moduleEyebrow">MÓDULO</span><strong>{label}</strong><p>{description}</p><span className="moduleLink">Abrir →</span></Link>}
