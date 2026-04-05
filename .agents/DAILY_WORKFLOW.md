# 📋 Daily Workflow — Zenco

Comandos cotidianos y guía rápida de inyección de skills para cada sesión de trabajo.

---

## 🚀 Levantar el Entorno Local

```bash
# Terminal 1 — Frontend (Dashboard)
cd C:/Users/admin/Documents/Github/Zenko
wsl npm run dev
# → http://localhost:5173 (o 5174 si el puerto está ocupado)

# Terminal 2 — Backend (API + Prisma)
cd C:/Users/admin/Documents/Github/Zenko/server-bot
wsl npx tsx src/index.ts
# → http://localhost:3000/api/garments

# Terminal 3 (Opcional) — Bot WhatsApp
cd C:/Users/admin/Documents/Github/Zenko/server-bot
wsl npx tsx src/bot.ts
# → Escanear QR con el WhatsApp de Ana
```

---

## 📦 Comandos de Base de Datos

```bash
cd server-bot

# Crear/sincronizar tablas desde schema.prisma
wsl npx prisma db push

# Poblar con datos iniciales de prueba
wsl npx tsx src/seed.ts

# Ver la DB en interfaz web (Prisma Studio)
wsl npx prisma studio
```

---

## 🌐 Deploy

| Tarea | Workflow |
|-------|---------|
| Publicar frontend (React) | `/deploy-vercel` |
| Publicar backend + bot | `/deploy-koyeb` |

---

## 📖 Skills Disponibles

| Skill | Cuándo usarlo |
|-------|--------------|
| `@.agents/skills/zenco-architect/SKILL.md` | Antes de editar cualquier parte del proyecto Zenco |

---

## 📁 Estructura Rápida de Archivos

| Archivo | Para qué sirve |
|---------|---------------|
| `.agents/knowledge/CONTEXTO_NEGOCIO.md` | Ana, Ariel, Jorge, Damián, plan comercial |
| `.agents/knowledge/ROADMAP_DETALLADO.md` | Sprints y tareas pendientes actualizadas |
| `.agents/MEMORY.md` | Bugs resueltos, decisiones técnicas, estado Git |
| `.agents/skills/zenco-architect/SKILL.md` | Mapa completo del proyecto para Antigravity |
| `.agents/workflows/deploy-vercel.md` | Pasos para publicar el frontend |
| `.agents/workflows/deploy-koyeb.md` | Pasos para publicar el backend/bot |
| `README.md` | Documentación oficial (para miembros del equipo) |
| `ROADMAP.md` | Versión simplificada del roadmap (para el equipo) |
