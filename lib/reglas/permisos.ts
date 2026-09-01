import type { Rol } from '@/lib/auth/session';

export type PortalRoute = '/admin-total'|'/admin-casino'|'/admin-casino/produccion'|'/finanzas'|'/coordinacion'|'/cocina'|'/recetas'|'/bodega'|'/operaciones'|'/gerencia'|'/reclamos-gestion';
export type PortalModule = { href:PortalRoute; label:string };

const MODULOS = {
  adminTotal:{href:'/admin-total',label:'Admin Total'},
  administracion:{href:'/admin-casino',label:'Admin Casino'},
  produccionAdmin:{href:'/admin-casino/produccion',label:'Producción · Admin'},
  finanzas:{href:'/finanzas',label:'Finanzas'},
  coordinacion:{href:'/coordinacion',label:'Coordinación'},
  cocina:{href:'/cocina',label:'Cocina y Producción'},
  recetas:{href:'/recetas',label:'Recetas'},
  bodega:{href:'/bodega',label:'Bodega'},
  operaciones:{href:'/operaciones',label:'Operaciones'},
  gerencia:{href:'/gerencia',label:'Gerencia'},
  reclamos:{href:'/reclamos-gestion',label:'Reclamos'},
} as const satisfies Record<string,PortalModule>;

export const ROLE_LABEL:Record<Rol,string>={AdminTotal:'Administrador Total',AdminCasino:'Administrador Casino',Finanzas:'Finanzas',Cocina:'Cocina',Coordinacion:'Coordinación',Gerencia:'Gerencia',Bodega:'Bodega',Operaciones:'Operaciones'};

export const MODULES_BY_ROLE:Record<Rol,readonly PortalModule[]>={
  AdminTotal:[MODULOS.adminTotal,MODULOS.administracion,MODULOS.produccionAdmin,MODULOS.finanzas,MODULOS.coordinacion,MODULOS.cocina,MODULOS.recetas,MODULOS.bodega,MODULOS.operaciones,MODULOS.gerencia,MODULOS.reclamos],
  AdminCasino:[MODULOS.administracion,MODULOS.produccionAdmin,MODULOS.cocina,MODULOS.recetas,MODULOS.reclamos],
  Finanzas:[MODULOS.finanzas,MODULOS.reclamos],
  Coordinacion:[MODULOS.coordinacion,MODULOS.reclamos],
  Cocina:[MODULOS.cocina,MODULOS.recetas,MODULOS.reclamos],
  Gerencia:[MODULOS.gerencia,MODULOS.reclamos],
  Bodega:[MODULOS.bodega],
  Operaciones:[MODULOS.operaciones],
};

export const HOME_BY_ROLE:Record<Rol,PortalRoute>={AdminTotal:'/admin-total',AdminCasino:'/admin-casino',Finanzas:'/finanzas',Cocina:'/cocina',Coordinacion:'/coordinacion',Gerencia:'/gerencia',Bodega:'/bodega',Operaciones:'/operaciones'};

export function canAccessRoute(rol:Rol,route:PortalRoute):boolean{return MODULES_BY_ROLE[rol].some((module)=>module.href===route);}
