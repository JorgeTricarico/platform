# M36: Ambientes QA — separar dev/qa/prod

## Problematica
Todo va directo a main y se deploya a producción. No hay forma de testear cambios en un ambiente intermedio antes de que los clientes reales los vean.

## Contexto
- Deploy actual: push a main → Render auto-deploy → producción
- Una sola DB Supabase compartida entre dev local y producción
- No hay ambiente de staging ni QA
- Los cambios se prueban solo en localhost

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

### Recomendación: Opción A + seeds
- Render Preview Environments son gratuitos en el plan actual
- Crear un script `seed-qa.ts` que genere datos de prueba realistas
- CI: tests en PR, preview deploy, QA manual, merge a main

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
