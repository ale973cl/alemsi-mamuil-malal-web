import type { Rol } from '@/lib/auth/session';
import { HOME_BY_ROLE } from '@/lib/reglas/permisos';

// Compatibilidad para el Route Handler de autenticación legado. La autorización
// y navegación viven exclusivamente en lib/reglas/permisos.ts.
export type Role = Rol;
export const ROLE_HOME:Record<Role,string>=HOME_BY_ROLE;
