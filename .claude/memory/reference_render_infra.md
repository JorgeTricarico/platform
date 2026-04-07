---
name: Render Infrastructure
description: Render service IDs, URLs, API token location, and visibility script
type: reference
---

**Render Services:**
- platform-backend: `srv-d78t7c94tr6s73cggik0` → platform-backend-8upb.onrender.com (Web Service)
- zenko-app: `srv-d78t8ema2pns73dppgl0` → platform-ypkr.onrender.com (Static Site)
- damian-app: `srv-d78t9c450q8c73f6g1k0` → damian-app.onrender.com (Static Site)

**API Token:** en `backend/.env` como `RENDER_API_TOKEN`

**Visibility script:** `bash scripts/render-status.sh [status|deploys|logs|env] [service]`

**How to apply:** Usar el script para diagnóstico rápido antes de deploys o cuando algo falla en producción. El token tiene acceso read a todos los servicios de la cuenta.
