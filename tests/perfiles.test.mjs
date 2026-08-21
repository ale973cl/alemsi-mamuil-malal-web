import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const matrix={
  AdminTotal:['administracion','finanzas','coordinacion','cocina','bodega','operaciones','gerencia'],
  AdminCasino:['administracion','cocina'],
  Finanzas:['finanzas'],
  Coordinacion:['coordinacion'],
  Cocina:['cocina'],
  Gerencia:['gerencia'],
  Bodega:['bodega'],
  Operaciones:['operaciones'],
};
const routes={administracion:'/admin-casino',finanzas:'/finanzas',coordinacion:'/coordinacion',cocina:'/cocina',bodega:'/bodega',operaciones:'/operaciones',gerencia:'/gerencia'};
const homes={AdminTotal:'/admin-casino',AdminCasino:'/admin-casino',Finanzas:'/finanzas',Coordinacion:'/coordinacion',Cocina:'/cocina',Gerencia:'/gerencia',Bodega:'/bodega',Operaciones:'/operaciones'};

test('la matriz canónica contiene todos los roles reales y solo sus rutas',async()=>{
  const permisos=await source('lib/reglas/permisos.ts');
  for(const [module,route] of Object.entries(routes)) assert.match(permisos,new RegExp(`${module}:\\{href:'${route.replace('/','\\/')}'`));
  for(const [role,routes] of Object.entries(matrix)){
    const entry=permisos.match(new RegExp(`${role}:\\[([^\\]]+)\\]`));
    assert.ok(entry,`falta ${role}`);
    for(const route of routes) assert.match(entry[1],new RegExp(`MODULOS\\.${route}`));
    for(const foreign of Object.values(matrix).flat()) if(!routes.includes(foreign)) assert.doesNotMatch(entry[1],new RegExp(`MODULOS\\.${foreign}(?:,|$)`));
  }
  for(const [role,home] of Object.entries(homes)) assert.match(permisos,new RegExp(`${role}:'${home.replace('/','\\/')}'`));
});

test('la navegación deriva exclusivamente de la matriz del usuario',async()=>{
  const shell=await source('components/AppShell.tsx');
  assert.match(shell,/MODULES_BY_ROLE\[user\.rol\]/);
  assert.match(shell,/HOME_BY_ROLE\[user\.rol\]/);
  assert.doesNotMatch(shell,/const links=\[/);
});

test('cada portal bloquea perfiles ajenos en el servidor',async()=>{
  const guards={
    'app/admin-casino/page.tsx':['AdminCasino','AdminTotal'],
    'app/finanzas/page.tsx':['Finanzas','AdminTotal'],
    'app/coordinacion/page.tsx':['Coordinacion','AdminTotal'],
    'app/cocina/page.tsx':['Cocina','AdminCasino','AdminTotal'],
    'app/bodega/page.tsx':['Bodega','AdminTotal'],
    'app/operaciones/page.tsx':['Operaciones','AdminTotal'],
    'app/gerencia/page.tsx':['Gerencia','AdminTotal'],
  };
  for(const [path,roles] of Object.entries(guards)){
    const page=await source(path);
    const guard=page.match(/requireUser\(\[([^\]]+)\]\)/);
    assert.ok(guard,`falta guard en ${path}`);
    for(const role of roles) assert.match(guard[1],new RegExp(`['"]${role}['"]`));
    for(const role of Object.keys(matrix)) if(!roles.includes(role)) assert.doesNotMatch(guard[1],new RegExp(`['"]${role}['"]`));
  }
});

test('Bodega y Operaciones no pueden iniciar ni cerrar producción',async()=>{
  const actions=await source('app/cocina/actions.ts');
  assert.doesNotMatch(actions,/['"](?:Bodega|Operaciones)['"]/);
});
