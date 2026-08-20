# ALEMSI Mamuil Malal · Reserva RC8 → Vercel

Port de circuito **Comensal → Reserva → PostgreSQL → Comprobante** desde el ZIP funcional RC8.

## Variables

Copiar `.env.example` a `.env.local` para desarrollo y configurar `DATABASE_URL` y `SESSION_SECRET` en Vercel para Preview/Production. Ambas variables son exclusivamente server-side y nunca deben usar el prefijo `NEXT_PUBLIC_`.

Antes de habilitar módulos que escriben datos, revisar y ejecutar manualmente `migrations/001_p0_runtime_schema.sql` sobre una réplica. La aplicación no ejecuta DDL durante requests.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

## Regla de seguridad

Los componentes de cliente no contienen credenciales ni SQL. PostgreSQL está encapsulado en `lib/db/` y las mutaciones pasan por Server Actions o Route Handlers.
