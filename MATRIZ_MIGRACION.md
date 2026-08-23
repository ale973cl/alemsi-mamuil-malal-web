# Matriz de migración completa RC8 → Vercel

| Prioridad | Perfil / circuito | Fuente RC8 | Destino Vercel | Regla | Estado |
|---|---|---|---|---|---|
| P0 | Acceso personal | `render_login_personal()` | `/login` + `/api/auth/login` | mismas credenciales/rol/activo | **base implementada** |
| P0 | Enrutamiento por perfil | navegación persistente + `render_casino/render_admin/render_coordinacion` | `/portal` | aislamiento estricto por rol | **base implementada** |
| P0 | Comensal | `render_comensal()` | `/comensal` | Reserva = demanda; no descuenta stock | ruta preparada |
| P0 | Finanzas | bloque `rol == Finanzas` | `/portal?modulo=finanzas` | comprobante recibido antes de validar Pagado | ruta preparada |
| P0 | Admin Casino | `render_admin()` / Minutas | `/portal?modulo=minutas` | gestiona minuta, envía a Coordinación, publica tras autorización | ruta preparada |
| P0 | Coordinación | `render_coordinacion()` | `/portal?modulo=coordinacion` | aprobar/observar/proponer; nunca editar minuta oficial | ruta preparada |
| P0 | Cocina | `render_casino()` | `/portal?modulo=cocina` | no ve Finanzas/Administración | ruta preparada |
| P0 | Producción | carga demanda + inicio/cierre | `/portal?modulo=produccion` | deduplicar RUT+fecha+servicio | ruta preparada |
| P1 | Gerencia | `render_admin()` rol Gerencia | `/portal?modulo=gerencia` | consulta/observación, sin aprobación financiera | ruta preparada |
| P2 | Bodega | RC8 existente | `/portal?modulo=bodega` | no modificar hoy; descuento solo Inicio jornada | preservada fuera de foco |
| P2 | Usuarios/Auditoría | AdminTotal | `/portal?modulo=usuarios/auditoria` | permisos extraordinarios + trazabilidad | rutas preparadas |

## Regla de salida
Streamlit continúa en producción. Vercel solo pasa a principal después de prueba de equivalencia por perfil. Nunca se corta Streamlit para probar la candidata.
