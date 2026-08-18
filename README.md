# ALEMSI · Migración Vercel RC8

Candidata paralela para portar ALEMSI Mamuil Malal desde Streamlit a Next.js/Vercel sin modificar la versión Streamlit.

## Ejecutar
1. Copiar `.env.example` a `.env.local`.
2. Configurar `DATABASE_URL` y `SESSION_SECRET`.
3. `npm install`
4. `npm run dev`

El login usa la tabla `usuarios` y el mismo SHA-256 legado de RC8 para permitir equivalencia durante la transición. La autenticación deberá endurecerse posteriormente sin interrumpir la migración funcional.
