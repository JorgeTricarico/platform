---
description: Deploy del Dashboard Zenco a Vercel (frontend público)
---

## Prerequisitos
- Código pusheado a GitHub (`git push -u origin master`)
- Cuenta en Vercel (vercel.com) — registro gratuito con GitHub

## Pasos

// turbo
1. Verificar que el repo esté en GitHub con todos los commits:
```bash
git log --oneline -5
git remote -v
```

2. Ir a https://vercel.com/new e importar el repositorio `Zenko` desde GitHub

3. En la pantalla de configuración de Vercel:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (raíz del proyecto)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Agregar Variable de Entorno en Vercel:
   - `VITE_API_URL` = URL pública del backend en Koyeb (ej: `https://zenco-bot.koyeb.app/api`)

5. Click "Deploy" — Vercel compila y publica automáticamente

6. Anotar la URL pública generada (ej: `https://zenco-dashboard.vercel.app`)

7. Actualizar el `.env.example` con la URL de Vercel:
```bash
echo "VERCEL_URL=https://zenco-dashboard.vercel.app" >> .env.example
```

// turbo
8. Verificar que la página carga correctamente en la URL de Vercel:
```bash
curl -o /dev/null -s -w "%{http_code}" https://zenco-dashboard.vercel.app
```

## Notas
- Cada `git push` a `master` redeploya automáticamente (CI/CD gratis)
- Las variables de entorno se configuran una vez en el panel de Vercel
- El bot de WhatsApp (Backend) necesita su propio deploy en Koyeb (ver workflow `deploy-koyeb`)
