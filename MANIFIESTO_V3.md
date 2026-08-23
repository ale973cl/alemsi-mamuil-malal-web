# ALEMSI Mamuil Malal — checkpoint manual V3

Base: respaldo estable entregado el 23-08-2026.

## Implementado en este checkpoint
- Admin Casino: minuta reencuadrada como calendario horizontal compacto con despliegue Día → Servicio/Plato → Institución → Comensales, sin navegación adicional.
- Admin Casino: gestión separada de visualización; nuevas altas/ediciones de minuta quedan BORRADOR en vez de publicarse automáticamente.
- Finanzas: acción excepcional "Validar sin comprobante" sobre la misma reserva, con medio obligatorio (WhatsApp, correo directo, transferencia revisada en banco, teléfono u otro), observación y confirmación explícita.
- Finanzas: revalidación de Gerencia después de cambios financieros.
- Coordinación: se reincorpora Atención al comensal con reclamos, sugerencias y felicitaciones desde la tabla existente.

## Archivos nuevos
- components/MinutaDemandCalendar.tsx

## Archivos modificados
- app/admin-casino/page.tsx
- lib/db/admin.ts
- app/finanzas/page.tsx
- app/finanzas/actions.ts
- lib/db/finanzas.ts
- app/coordinacion/page.tsx
- lib/db/coordinacion.ts

## No realizado todavía
Este checkpoint NO declara terminada toda la V3. Faltan, entre otros, motor único de envío de correo y configuración completa desde Admin Total, carga manual/masiva/PDF avanzada de minuta, correo editable de aprobación, integración transversal restante y cierre de reportes.

## Validación técnica
- npm ci: NO EJECUTADO (el respaldo no incluye package-lock.json, por lo que npm ci no es válido).
- typecheck: FAIL / NO CERTIFICABLE por dependencias Next/React/PG no instaladas en este entorno. El tsc global no puede resolver esos módulos.
- tests/auditoria-runtime.test.mjs: PASS (5/5).
- tests/comensal.test.mjs: NO EJECUTABLE en Node directo: importa TypeScript y el entorno no tiene loader TS del proyecto instalado.
- npm run build: NO EJECUTADO por dependencias no instaladas.

## Base de datos
No se ejecutaron migraciones ni se modificó Supabase/PostgreSQL.
