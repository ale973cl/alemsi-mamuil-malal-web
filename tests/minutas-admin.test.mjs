import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validarFilasMinuta } from '../lib/reglas/minutas.ts';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('la grilla valida fechas, servicios, opciones, duplicados y platos repetidos',()=>{
  assert.deepEqual(validarFilasMinuta([{fecha:'2026-08-24',servicio:'Almuerzo',tipo_opcion:'OPCION 1',plato:'Cazuela'}]),[]);
  const errores=validarFilasMinuta([
    {fecha:'mal',servicio:'Brunch',tipo_opcion:'OTRA',plato:''},
    {fecha:'2026-08-24',servicio:'Almuerzo',tipo_opcion:'OPCION 1',plato:'Cazuela'},
    {fecha:'2026-08-24',servicio:'Almuerzo',tipo_opcion:'OPCION 1',plato:'Pollo'},
    {fecha:'2026-08-24',servicio:'Almuerzo',tipo_opcion:'OPCION 2',plato:' pollo '},
  ]);
  for(const texto of ['Fecha inválida','Servicio no permitido','Opción no permitida','Plato obligatorio','Combinación duplicada','Opción 1 y Opción 2 repiten plato']) assert.ok(errores.some(error=>error.mensaje.includes(texto)),texto);
});

test('CSV ofrece plantilla, vista previa editable y guardado atómico',async()=>{
  const [component,db]=await Promise.all([source('components/MinutaCarga.tsx'),source('lib/db/admin.ts')]);
  for(const columna of ['fecha','servicio','opcion','plato']) assert.match(component,new RegExp(columna));
  assert.match(component,/Descargar plantilla CSV/);
  assert.match(component,/Cargar CSV/);
  assert.match(component,/guardarMinutasAction\(rows\)/);
  assert.match(db,/export async function guardarMinutas/);
  assert.match(db,/inTransaction\(async c=>/);
  assert.match(db,/ya existe \$\{row\.fecha\}/);
  const carga=db.slice(db.indexOf('export async function guardarMinutas'),db.indexOf('export async function registrarAutorizacionExterna'));
  assert.doesNotMatch(carga,/ON CONFLICT.*DO UPDATE/);
});

test('los límites del período se aplican a pantalla, Coordinación y publicación',async()=>{
  const [page,db,coordinacion]=await Promise.all([source('app/admin-casino/page.tsx'),source('lib/db/admin.ts'),source('lib/db/coordinacion.ts')]);
  assert.match(page,/minutasPeriodo\(ini,fin\)/);
  assert.match(db,/fecha BETWEEN \$1 AND \$2/);
  assert.match(db,/fecha_desde=\$1 AND fecha_hasta=\$2/);
  assert.match(coordinacion,/fecha BETWEEN \$1 AND \$2/);
  assert.doesNotMatch(db,/export async function minutasPeriodo[^]*fecha>=CURRENT_DATE/);
});

test('Guardar día conserva historial y evita el componente cliente que fallaba en Production',async()=>{
  const [component,db]=await Promise.all([source('components/RevisionDia.tsx'),source('lib/db/coordinacion.ts')]);
  assert.doesNotMatch(component,/'use client'|useTransition|useState/);
  assert.match(component,/form action=\{guardarDiaAction\}/);
  assert.match(component,/>Guardar día</);
  assert.doesNotMatch(db,/DELETE FROM minuta_revision_coordinacion/);
  assert.match(db,/DISTINCT ON \(fecha,servicio,tipo_opcion,plato_actual\)/);
});

test('la autorización externa reutiliza el flujo y no publica automáticamente',async()=>{
  const [page,actions,db]=await Promise.all([source('app/admin-casino/page.tsx'),source('app/admin-casino/actions.ts'),source('lib/db/admin.ts')]);
  assert.match(page,/Registrar autorización externa/);
  assert.match(actions,/requireUser\(\['AdminCasino','AdminTotal'\]\)/);
  assert.match(db,/REGISTRAR_AUTORIZACION_EXTERNA_MINUTA/);
  const externa=db.slice(db.indexOf('export async function registrarAutorizacionExterna'),db.indexOf('export async function enviarCoordinacion'));
  assert.match(externa,/INSERT INTO minuta_flujo_coordinacion[^]*'AUTORIZADA'/);
  assert.doesNotMatch(externa,/UPDATE minutas SET estado='PUBLICADA'/);
});

test('editar una minuta vuelve a PUBLICABLE e invalida revisión o publicación',async()=>{
  const db=await source('lib/db/admin.ts');
  assert.match(db,/UPDATE minutas SET fecha=\$1,servicio=\$2,tipo_opcion=\$3,plato=\$4,activo=1,estado='PUBLICABLE'/);
  assert.match(db,/estado IN \('EN_REVISION','AUTORIZADA','PUBLICADA'\)/);
  assert.match(db,/REQUIERE_REVALIDACION/);
});

test('PDF queda bloqueado sin inventar parser',async()=>{
  const page=await source('app/admin-casino/page.tsx');
  assert.match(page,/PDF: pendiente de recuperar el parser histórico/);
  assert.doesNotMatch(page,/from ['"](?:pdf-parse|pypdf)/);
});
