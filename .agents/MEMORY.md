# 📚 MEMORY — Decisiones Técnicas y Contexto de Sesiones

Este archivo registra decisiones de diseño importantes tomadas en cada sesión, para no repetir investigación previa.

---

## Sesión Fundacional — Abril 2026

### Decisiones de Diseño Tomadas

| Decisión | Opción elegida | Alternativa descartada | Motivo |
|----------|---------------|----------------------|--------|
| Base de datos local | SQLite | PostgreSQL directo | Velocidad de setup, zero config, apropiado para fase early |
| Base de datos prod | Supabase / Neon | PlanetScale, RDS | Free tier generoso (500MB), soporte Prisma nativo |
| Bot WhatsApp | Baileys (QR) | Meta WhatsApp Cloud API | Meta cobra por mensaje; Baileys es gratis |
| Motor IA | Gemini 1.5 Flash | GPT-4, Claude | Costo $0 con free tier, Function Calling nativo |
| Deploy frontend | Vercel | Netlify, GitHub Pages | CI/CD automático con GitHub, dominio HTTPS gratis |
| Deploy backend | Koyeb | Render, Railway | Koyeb no "duerme" su tier gratuito; Render apaga tras 15min |
| CSS Framework | Vanilla CSS con variables | TailwindCSS | Más control sobre el design system, sin dependencias |
| ORM | Prisma | Drizzle, TypeORM | Más maduro, excelente soporte TypeScript y migraciones |
| Tests E2E | Playwright (WSL) | Extensión navegador | Más rápido; la extensión fue descartada por lentitud |
| Monorepo | Sí (todo en Zenko/) | Repos separados | Simplicidad de gestión para emprendimiento pequeño |

### Bugs y Problemas Resueltos

| Problema | Causa Raíz | Solución Aplicada |
|----------|-----------|-------------------|
| Pantalla en blanco en localhost | Caché agresivo de Vite atascado | `rm -rf node_modules/.vite && npm run dev --force` |
| TypeScript error: "not a type-only import" | `verbatimModuleSyntax: true` en tsconfig | Usar `import type { X }` en vez de `import { X }` |
| TypeScript error: "'test' does not exist in UserConfigExport" | Vitest no declarado en vite.config.ts | Agregar `/// <reference types="vitest" />` |
| Puerto 5173 en uso | Servidor previo no terminado | Vite auto-redirige a 5174 |
| Prisma "MISSING_KEY" en DB | Se cambió provider a postgres pero DATABASE_URL seguía apuntando a SQLite | Revertir a SQLite local hasta tener Supabase configurado |

### APIs y Credenciales Conocidas
> ⚠️ NUNCA hardcodear en el código. Solo en `.env` (gitignoreado)

- `GEMINI_API_KEY` → disponible en `Agent-Automation-TS/.env` (no commiteado)
- `GITHUB_TOKEN` → disponible  
- `XAI_API_KEY` → disponible
- `MISTRAL_API_KEY` → disponible
- `DATABASE_URL` → pendiente Supabase. Local: `file:./zenco-dev.db`

### Estado del Repositorio Git
- ✅ Inicializado localmente
- ✅ 4+ commits con todo el código base
- ❌ **NO pusheado a GitHub** — BLOCKER para producción
- ❌ Remote origin no configurado

---

## Próxima Sesión — Continuación Recomendada

**Prompt sugerido para iniciar la próxima sesión:**

```
Soy Jorge. Continuamos Zenco. El repo está en C:\Users\admin\Documents\Github\Zenko
con 4+ commits locales listos para publicar. 

Quiero:
1. Hacer git push al repo GitHub que acabo de crear: [PEGAR URL AQUÍ]
2. Deploy en Vercel del frontend
3. Deploy del backend en Koyeb + Supabase

Lee el skill @.agents/skills/zenco-architect/SKILL.md antes de empezar.
```
