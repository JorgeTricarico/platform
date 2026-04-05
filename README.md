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
