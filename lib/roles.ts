export type Role = "AdminTotal" | "AdminCasino" | "Operaciones" | "Gerencia" | "Bodega" | "Finanzas" | "Cocina" | "Coordinacion";

export const ROLE_HOME: Record<Role, string> = {
  AdminTotal: "/portal?modulo=administracion",
  AdminCasino: "/portal?modulo=administracion",
  Operaciones: "/portal?modulo=administracion",
  Gerencia: "/portal?modulo=gerencia",
  Bodega: "/portal?modulo=bodega",
  Finanzas: "/portal?modulo=finanzas",
  Cocina: "/portal?modulo=cocina",
  Coordinacion: "/portal?modulo=coordinacion",
};

export const ROLE_MODULES: Record<Role, string[]> = {
  AdminTotal: ["inicio","reservas","minutas","produccion","finanzas","bodega","reportes","gerencia","usuarios","auditoria"],
  AdminCasino: ["inicio","reservas","minutas","produccion","reportes"],
  Operaciones: ["inicio","reservas","produccion","reportes"],
  Gerencia: ["inicio","gerencia","reportes","minutas"],
  Bodega: ["inicio","bodega"],
  Finanzas: ["inicio","finanzas"],
  Cocina: ["inicio","cocina","produccion"],
  Coordinacion: ["inicio","coordinacion"],
};

export const MODULE_LABELS: Record<string,string> = {
  inicio:"Inicio", reservas:"Reservas", minutas:"Minutas", produccion:"Producción", finanzas:"Finanzas",
  bodega:"Bodega", reportes:"Reportes", gerencia:"Gerencia", usuarios:"Usuarios", auditoria:"Auditoría",
  cocina:"Cocina", coordinacion:"Coordinación"
};
