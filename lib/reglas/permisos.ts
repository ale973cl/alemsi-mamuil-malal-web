import type { Rol } from '@/lib/auth/session';
export const HOME_BY_ROLE:Record<Rol,string>={AdminTotal:'/admin-casino',AdminCasino:'/admin-casino',Finanzas:'/finanzas',Cocina:'/cocina',Coordinacion:'/coordinacion',Gerencia:'/gerencia',Bodega:'/cocina',Operaciones:'/admin-casino'};
export const ROLE_LABEL:Record<Rol,string>={AdminTotal:'Administrador Total',AdminCasino:'Administrador Casino',Finanzas:'Finanzas',Cocina:'Cocina',Coordinacion:'Coordinación',Gerencia:'Gerencia',Bodega:'Bodega',Operaciones:'Operaciones'};
