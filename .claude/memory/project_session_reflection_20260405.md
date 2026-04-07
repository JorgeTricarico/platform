---
name: session-reflection-2026-04-05
description: Reflexion de sesion con mejoras propuestas para el agente orquestador y roadmap de features para la plataforma
type: project
---

## Reflexion de sesion — 2026-04-05

### Problemas detectados en el workflow del agente

1. **Sin TDD = bugs en produccion**: El CRUD de garments se implementó sin tests. El POST fallaba y nadie lo sabia hasta que el usuario lo probó manualmente. Leccion: TDD no es opcional, es un gate.

2. **Orquestador lee demasiado**: El CLAUDE.md dice "nunca leas código directamente", pero para un proyecto chico con contexto conocido, delegar cada lectura a sub-agentes agrega latencia sin beneficio. **Mejora propuesta**: el orquestador puede leer cuando ya tiene contexto y el codebase es <50 archivos. Delegar cuando investiga algo desconocido o el repo es grande.

3. **Migración DB como bloqueante silencioso**: Se agregaron modelos a Prisma pero nunca se ejecutó `db push`. Esto dejó el backend compilando OK pero fallando en runtime. **Mejora propuesta**: agregar un pre-commit hook o check que detecte schema changes sin migración aplicada.

4. **Error handling opaco**: Los `catch` del backend devolvían mensajes genéricos sin loguear el error real. Esto hizo imposible diagnosticar remotamente. **Mejora propuesta**: todos los endpoints deben loguear `console.error(error)` en el catch.

5. **Falta validación de inputs**: El backend confia en que el frontend manda los tipos correctos (price como number, campos required). No hay validación server-side. **Mejora propuesta**: agregar zod para validar request bodies.

### Roadmap de mejoras — Plataforma

#### Corto plazo (próximas 2 sesiones)
- [ ] Ejecutar migración DB (bloqueante)
- [ ] Completar test suite backend con TDD (Damian endpoints)
- [ ] Agregar zod validation a todos los endpoints
- [ ] Mejorar error handling: loguear errores reales + devolver details en dev mode
- [ ] CI básico: GitHub Action que corra `vitest run` en cada push

#### Medio plazo (1-2 semanas)
- [ ] **Ficha clínica enriquecida**: agregar campos de peso, altura, presión arterial, alergias al modelo Client (específico Damian)
- [ ] **Historial de chat persistente**: guardar conversaciones del chatbot en DB para que el agente IA tenga contexto entre sesiones
- [ ] **Dashboard mejorado Damian**: widget de "próximos turnos del día" + "pacientes sin ficha reciente"
- [ ] **Notificaciones en-app**: alertas cuando un turno está por llegar o una prenda está lista
- [ ] **Búsqueda global**: un search bar que busque en clientes, órdenes y citas al mismo tiempo
- [ ] **Export de fichas**: generar PDF de la historia clínica de un paciente

#### Largo plazo (post-demo)
- [ ] **WhatsApp real** (Baileys): conectar el chatbot al WhatsApp real de cada negocio
- [ ] **Google Calendar sync** (Damian): los turnos se reflejan en Google Calendar automáticamente
- [ ] **Multi-tenant**: agregar más negocios al monorepo sin duplicar código (config-driven)
- [ ] **Analytics dashboard**: métricas de negocio (ingresos/mes, clientes nuevos, tasa de retorno)
- [ ] **Backup automático**: snapshot diario de la DB a un bucket S3/GCS
- [ ] **PWA**: hacer las apps instalables en el celular de Ana/Ariel/Damian

### Roadmap de mejoras — Agente/Skills

- [ ] **Skill TDD como gate**: no permitir que el agente marque un task como completo sin tests que pasen
- [ ] **Pre-flight check skill**: antes de pushear, verificar: tests pasan, types compilan, no hay console.log sueltos, no hay .env commiteados
- [ ] **Migration detector**: skill que detecte cambios en schema.prisma y recuerde que hay que correr `db push`
- [ ] **Retry con diagnóstico**: cuando un endpoint falla, el agente debería probar el endpoint con curl antes de buscar en código
- [ ] **Sesión de testing automatizada**: skill que al final de cada implementación lance tests automáticamente y reporte resultados
