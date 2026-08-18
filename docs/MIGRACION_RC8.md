# ALEMSI RC8 → Vercel

Fuente maestra: `ALEMSI_v2.1.3.45_RC8_CIRCUITOS_FUNCIONALES.zip`.

## Reglas congeladas
- Reserva = demanda; reservar/modificar no descuenta inventario.
- Producción = consolidación; deduplicación oficial RUT + fecha + servicio.
- Bodega = movimiento físico; descuento solo desde Iniciar jornada, una vez, con minuta vigente y receta activa/aprobada.
- Coordinación revisa/aprueba/observa/propone; nunca edita la minuta oficial.
- Finanzas valida comprobantes antes de Pagado.
- Cocina no ve Finanzas ni Administración.
- Gerencia observa/consulta y no reemplaza autorización de Coordinación.
- Circuito protegido: Reserva → PostgreSQL → comprobante → correo.

## Orden de portación hoy
1. Acceso personal + perfiles.
2. Comensal + reserva/cancelación/excepción.
3. Finanzas + comprobantes.
4. AdminCasino + minutas.
5. Coordinación.
6. Cocina + producción.
7. Gerencia + reportes.
8. Bodega: conservar y validar enlace; mejoras posteriores.

## Estrategia de datos
Durante la transición, Vercel puede conectar a la misma PostgreSQL de la app Streamlit mediante `DATABASE_URL` privada. No duplicar datos ni crear una segunda fuente de verdad hoy.
