# ALEMSI Mamuil Malal · Reserva RC8 → Vercel

Port de circuito **Comensal → Reserva → PostgreSQL → Comprobante** desde el ZIP funcional RC8.

## Variables

Copiar `.env.example` a `.env.local` para desarrollo y configurar `DATABASE_URL` en Vercel para Preview/Production.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run typecheck
npm run build
```

## Regla de seguridad

Los componentes de cliente no contienen credenciales ni SQL. PostgreSQL está encapsulado en `lib/db/` y las mutaciones pasan por Server Actions o Route Handlers.
