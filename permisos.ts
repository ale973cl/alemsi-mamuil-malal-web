import type { Rol } from '@/lib/auth/session';

export type PortalRoute = '/admin-total'|'/admin-casino'|'/finanzas'|'/coordinacion'|'/cocina'|'/bodega'|'/operaciones'|'/gerencia';
export type PortalModule = { href:PortalRoute; label:string };

const MODULOS = {
  gobierno:{href:'/admin-total',label:'Administración general'},
  administracion:{href:'/admin-casino',label:'Operación de casino'},
  finanzas:{href:'/finanzas',label:'Pagos y comprobantes'},
  coordinacion:{href:'/coordinacion',label:'Revisión de minutas'},
  cocina:{href:'/cocina',label:'Producción'},
  bodega:{href:'/bodega',label:'Bodega'},
  operaciones:{href:'/operaciones',label:'Operaciones'},
  gerencia:{href:'/gerencia',label:'Resumen ejecutivo'},
} as const satisfies Record<string,PortalModule>;

export const ROLE_LABEL:Record<Rol,string>={AdminTotal:'Administrador Total',AdminCasino:'Administración de Casino',Finanzas:'Finanzas',Cocina:'Cocina',Coordinacion:'Coordinación',Gerencia:'Gerencia',Bodega:'Bodega',Operaciones:'Operaciones'};

export const MODULES_BY_ROLE:Record<Rol,readonly PortalModule[]>={
  AdminTotal:[MODULOS.gobierno,MODULOS.administracion,MODULOS.cocina,MODULOS.finanzas,MODULOS.coordinacion,MODULOS.gerencia],
  AdminCasino:[MODULOS.administracion,MODULOS.cocina],
  Finanzas:[MODULOS.finanzas],
  Coordinacion:[MODULOS.coordinacion],
  Cocina:[MODULOS.cocina],
  Gerencia:[MODULOS.gerencia],
  Bodega:[MODULOS.bodega],
  Operaciones:[MODULOS.operaciones],
};

export const HOME_BY_ROLE:Record<Rol,PortalRoute>={AdminTotal:'/admin-total',AdminCasino:'/admin-casino',Finanzas:'/finanzas',Cocina:'/cocina',Coordinacion:'/coordinacion',Gerencia:'/gerencia',Bodega:'/bodega',Operaciones:'/operaciones'};

export function canAccessRoute(rol:Rol,route:PortalRoute):boolean{
  return MODULES_BY_ROLE[rol].some((module)=>module.href===route);
}
