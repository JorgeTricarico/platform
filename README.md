# Platform

Plataforma centralizada para gestionar multiples emprendimientos con:
- Dashboard web por cliente
- Bot de WhatsApp con IA (Gemini)
- Base de datos compartida con schemas por cliente
- Deploy gratuito en Render

## Estructura

```
Platform/
  backend/              → API unificada (Express + Prisma + Gemini)
    src/routes/         → Rutas por cliente (/api/zenco/*, /api/damian/*)
  clients/
    zenco/              → Frontend Ana & Ariel (arreglos de ropa)
    damian/             → Frontend Damian (masajes)
```

## Clientes Activos

| Cliente | Negocio | Endpoints |
|---------|---------|-----------|
| Zenco | Arreglos de ropa | `/api/zenco/*` |
| Damian | Masajes y bienestar | `/api/damian/*` |

## Setup Local

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (cada cliente)
cd clients/zenco && npm install && npm run dev
cd clients/damian && npm install && npm run dev
```

## Deploy (Render Free Tier)

- 1 Web Service (backend) = 750 hrs/mes gratis
- N Static Sites (clientes) = gratis ilimitado
- DB: Supabase PostgreSQL free tier

## Workflow de deploys (M36)

Dos ambientes: **QA** (rama `develop`) y **prod** (rama `main`). Sin PRs — push directo.

```
trabajo local → push develop → auto-deploy QA → validar → merge a main → auto-deploy prod
```

**Ambientes:**

| Ambiente | Rama | Backend | Zenko | Damian | DB Supabase |
|----------|------|---------|-------|--------|-------------|
| Prod | `main` | platform-backend-8upb.onrender.com | platform-ypkr.onrender.com | damian-app.onrender.com | proyecto `platform` |
| QA | `develop` | platform-backend-qa.onrender.com | zenko-app-qa.onrender.com | damian-app-qa.onrender.com | proyecto `platform-qa` |

**Pasos para cualquier cambio:**

```bash
# 1. Trabajar en develop
git checkout develop
# ... cambios ...
git commit -am "feat: ..."
git push                          # auto-deploy QA

# 2. Validar en URLs QA. Si rompe algo, fix en develop y repetir.

# 3. Promover a prod
git checkout main
git merge develop --ff-only
git push                          # auto-deploy prod
git checkout develop              # volver a develop para el próximo cambio
```

**Migraciones de schema:**

- Crear migration: `cd backend && npx prisma migrate dev --name <slug>` (genera archivo en `prisma/migrations/`).
- **Nunca** `prisma db push` contra prod — desincroniza `_prisma_migrations` (ver incidente 2026-05-17).
- Al pushear a `develop`, Render corre `prisma migrate deploy` contra DB QA en el build del backend. Si falla, falla el deploy QA antes de tocar prod.
- Cuando QA está verde, el merge a `main` aplica las mismas migraciones contra prod automáticamente.
