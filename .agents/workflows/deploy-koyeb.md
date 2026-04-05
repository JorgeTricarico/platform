---
description: Deploy del Backend (API + Bot WhatsApp) a Koyeb — plataforma gratuita permanente
---

## Prerequisitos
- Código pusheado a GitHub
- Cuenta en Koyeb (koyeb.com) — registro gratuito con GitHub
- Variables de entorno listas: `GEMINI_API_KEY`, `DATABASE_URL` (de Supabase)

## Pasos

1. Configurar Supabase primero (base de datos en la nube):
   - Ir a https://supabase.com → New Project
   - Copiar la **Connection String** del pooler (Transaction mode, puerto 6543)
   - Formato: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Pegar en el campo `DATABASE_URL` del `.env` de `server-bot/`

2. Migrar el schema a PostgreSQL:
```bash
cd server-bot
# Cambiar provider en schema.prisma: sqlite → postgresql
npx prisma db push
npx prisma generate
```

3. Ir a https://app.koyeb.com → Create Service → GitHub

4. Configuración del servicio en Koyeb:
   - **Repositorio:** Zenko
   - **Branch:** master
   - **Source directory:** `server-bot`
   - **Build command:** `npm install && npx prisma generate`
   - **Run command:** `npm start`
   - **Port:** 3000
   - **Instance type:** Nano (gratuito)

5. Agregar Variables de Entorno en Koyeb:
   - `GEMINI_API_KEY` = tu API key de Google AI Studio
   - `DATABASE_URL` = connection string de Supabase
   - `PORT` = 3000

6. Deploy → esperar ~3 minutos

7. Copiar la URL pública de Koyeb (ej: `https://zenco-bot-jorge.koyeb.app`)

8. Volver a Vercel y actualizar la variable `VITE_API_URL` con esa URL + `/api`:
   - `VITE_API_URL` = `https://zenco-bot-jorge.koyeb.app/api`
   - Forzar redeploy de Vercel

## Sobre el Bot de WhatsApp
- El Bot de Baileys necesita escanear el código QR **una vez** al arrancar
- Los tokens se guardan en el volumen `auth_info_baileys/`
- En Koyeb, los discos no son persistentes en el plan gratuito → se necesita un volumen externo o re-escanear cuando el servicio se reinicia
- **Alternativa más estable:** VPS propio (Oracle Cloud Always Free o Google Cloud e2-micro)

## Notas
- Koyeb Plan Nano: 512MB RAM, 0.1 vCPU — suficiente para el bot y la API de Zenco
- Si el servicio "duerme" en Koyeb, usar un ping automático (UptimeRobot gratis) para mantenerlo despierto
