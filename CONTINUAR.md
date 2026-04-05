# Prompt de Continuacion - Platform

Copia y pega esto en una nueva sesion de Claude Code:

---

## Contexto del proyecto

Estoy trabajando en `/home/jorge/Documents/Github/Platform` (WSL Ubuntu). Es una plataforma centralizada para gestionar multiples emprendimientos. Repo: `github.com/JorgeTricarico/platform`.

### Estructura actual:
```
Platform/
  backend/                → Express + Prisma 7 + pg adapter + Gemini 1.5 Flash
    src/index.ts          → Monta rutas /api/zenco/* y /api/damian/*
    src/routes/zenco.ts   → CRUD garments + finances
    src/routes/damian.ts  → CRUD appointments + finances  
    src/routes/chat-zenco.ts  → Chat bot demo con Gemini (Ana de Zenco)
    src/routes/chat-damian.ts → Chat bot demo con Gemini (Damian masajes)
    src/db.ts             → PrismaClient con @prisma/adapter-pg
    prisma/schema.prisma  → Order, Appointment, ZencoFinance, DamianFinance
  clients/
    zenco/                → React+Vite frontend (arreglos de ropa, Ana & Ariel)
    damian/               → React+Vite frontend (masajes, config.ts centralizado)
  render.yaml             → 1 web service free + 2 static sites gratis
```

### Estado actual:
- Todo el codigo compila OK (backend + ambos frontends)
- Push hecho a github.com/JorgeTricarico/platform
- Chat bot demo integrado en ambos frontends (tab "Chat Bot Demo")
- Falta:
  1. **Reactivar Supabase** - El proyecto esta PAUSADO. Ir a supabase.com/dashboard, restaurar el proyecto `mdspjstgmjkwcpmttpec`, luego ejecutar `cd backend && npx prisma db push && npx tsx src/seed.ts`
  2. **Deploy en Render** - Crear servicios desde render.yaml (1 backend web service + 2 static sites). Env vars: DATABASE_URL (de Supabase), GEMINI_API_KEY, VITE_API_URL para cada frontend
  3. **Verificar** que todo funcione end-to-end (crear ordenes, crear citas, chat demo)

### Constraints:
- Todo GRATIS: Render free tier, Supabase free, Gemini API free
- Trabajo desde WSL Ubuntu, IDEs en Windows (Antigravity con open-remote-wsl)
- Mi GEMINI_API_KEY: esta en backend/.env
- Bot de WhatsApp (Baileys) corre LOCAL, no en Render (no hay persistent disk)

### Lo que necesito ahora:
[ESCRIBE ACA LO QUE NECESITAS]
