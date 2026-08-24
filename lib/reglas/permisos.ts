import type { Rol } from '@/lib/auth/session';

export type PortalRoute = '/admin-casino'|'/finanzas'|'/coordinacion'|'/cocina'|'/bodega'|'/operaciones'|'/gerencia'|'/reclamos-gestion';
export type PortalModule = { href:PortalRoute; label:string };

const MODULOS = {
  administracion:{href:'/admin-casino',label:'Admin Casino'},
  finanzas:{href:'/finanzas',label:'Finanzas'},
  coordinacion:{href:'/coordinacion',label:'Coordinación'},
  cocina:{href:'/cocina',label:'Cocina y Producción'},
  bodega:{href:'/bodega',label:'Bodega'},
  operaciones:{href:'/operaciones',label:'Operaciones'},
  gerencia:{href:'/gerencia',label:'Gerencia'},
  reclamos:{href:'/reclamos-gestion',label:'Seguimiento reclamos'},
} as const satisfies Record<string,PortalModule>;

export const ROLE_LABEL:Record<Rol,string>={AdminTotal:'Administrador Total',AdminCasino:'Administrador Casino',Finanzas:'Finanzas',Cocina:'Cocina',Coordinacion:'Coordinación',Gerencia:'Gerencia',Bodega:'Bodega',Operaciones:'Operaciones'};

export const MODULES_BY_ROLE:Record<Rol,readonly PortalModule[]>={
  AdminTotal:[MODULOS.administracion,MODULOS.reclamos,MODULOS.finanzas,MODULOS.coordinacion,MODULOS.cocina,MODULOS.bodega,MODULOS.operaciones,MODULOS.gerencia],
  AdminCasino:[MODULOS.administracion,MODULOS.reclamos,MODULOS.cocina],
  Finanzas:[MODULOS.finanzas,MODULOS.reclamos],
  Coordinacion:[MODULOS.coordinacion,MODULOS.reclamos],
  Cocina:[MODULOS.cocina],
  Gerencia:[MODULOS.gerencia,MODULOS.reclamos],
  Bodega:[MODULOS.bodega],
  Operaciones:[MODULOS.operaciones],
};

export const HOME_BY_ROLE:Record<Rol,PortalRoute>={AdminTotal:'/admin-casino',AdminCasino:'/admin-casino',Finanzas:'/finanzas',Cocina:'/cocina',Coordinacion:'/coordinacion',Gerencia:'/gerencia',Bodega:'/bodega',Operaciones:'/operaciones'};

export function canAccessRoute(rol:Rol,route:PortalRoute):boolean{
  return MODULES_BY_ROLE[rol].some((module)=>module.href===route);
}
