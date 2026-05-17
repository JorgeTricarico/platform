# M36: Ambientes QA — separar dev/qa/prod

## Problematica
Todo va directo a main y se deploya a producción. No hay forma de testear cambios en un ambiente intermedio antes de que los clientes reales los vean.

**Incidente 2026-05-17 que confirma la urgencia:** al probar el flujo de QR con una orden de prueba en prod, falló el cambio de status a "listo" porque la columna `notifications.audience` no existía en la DB. El schema la declaraba, pero el repo tenía **3 migraciones desfasadas** que nunca corrieron en prod porque alguien previamente aplicó cambios con `prisma db push` directo, dejando `_prisma_migrations` desincronizada. Fix requirió `prisma migrate resolve --applied` x2 + `migrate deploy` ejecutado contra prod desde local. Sin QA, este tipo de drift se descubre cuando rompe al cliente real.

## Contexto
- Deploy actual: push a main → Render auto-deploy → producción
- Una sola DB Supabase compartida entre dev local y producción
- No hay ambiente de staging ni QA
- Los cambios se prueban solo en localhost
- **Drift recurrente:** `prisma db push` aplicado directo a prod sin generar migraciones versionadas → schema y migrations divergen silenciosamente

## Implementacion propuesta

### Opción A: Ramas + Render Preview Environments (recomendada)
1. **Rama `develop`**: trabajo diario, CI corre tests
2. **Rama `main`**: producción estable
3. **Render Preview Environments**: cada PR a `main` crea un deploy temporal con su propia URL
4. **Supabase**: crear proyecto "Platform-QA" con DB separada
5. **Variables de entorno**:
   - `.env.development` → DB local o QA
   - `.env.qa` → Supabase QA
   - `.env.production` → Supabase producción
6. **Workflow**: develop → PR → preview deploy + QA DB → review → merge → producción

### Opción B: Docker Compose local
1. `docker-compose.yml` con PostgreSQL + backend + frontend
2. Seeds automáticos para datos de prueba
3. No depende de Supabase para desarrollo
4. Más pesado de mantener

### Recomendación: 3 fases incrementales (post-incidente 2026-05-17)

**F1 — Branch DB Supabase + servicios QA en Render (1h setup, costo $0)**
- Supabase free tier: hasta 2 branches del proyecto. Crear `zenko-qa` como branch del prod.
- Render: duplicar los 3 servicios → `platform-backend-qa`, `zenko-app-qa`, `damian-app-qa`. Auto-deploy desde rama `develop`.
- Workflow nuevo: PR a `develop` → deploy QA → validación manual → merge a `main` → deploy prod.
- Variables: `RENDER_DATABASE_URL` ya viene seteada por Render, solo cambia por servicio.

**F2 — Migrate validation en CI (medio día)**
- GitHub Action que en cada PR levanta Postgres efímero en el runner.
- Corre `prisma migrate deploy` contra el Postgres limpio. Si falla, falla el PR.
- Corre `prisma migrate diff --from-migrations --to-schema-datamodel`. Si hay diff != 0, falla el PR (drift detector).
- Esto habría atrapado el bug de hoy: la migración faltaba en el repo aunque el schema la tenía.

**F3 — Seed dataset realista (1 día)**
- Script `seed-qa.ts` idempotente: ~50 clientes, ~200 órdenes en distintos estados, finanzas de 3 meses, citas de Damian.
- Permite probar features con datos parecidos a prod sin riesgo.
- Útil también para demos a clientes potenciales.

## Criterio de aceptacion
- [ ] Rama `develop` existe y CI corre tests en cada push
- [ ] PR a main genera preview deployment automático
- [ ] DB QA separada con datos de prueba
- [ ] Script `seed-qa.ts` genera 50+ órdenes, 20+ clientes, 30+ citas
- [ ] Documentado en README cómo usar cada ambiente

## Notas
- No bloquea desarrollo actual — es una mejora de proceso
- El script de seed es útil también para demos a potenciales clientes
- Considerar feature flags para activar/desactivar funcionalidades por ambiente
