# Cost Comparison: Render vs Hetzner + Coolify

*Prices in USD. Hetzner prices converted from EUR at 1 EUR = 1.09 USD (approximate). Last updated: April 2026.*

---

## Current Setup (Render Free/Starter)

| Component | Service | Cost/month |
|-----------|---------|-----------|
| Backend | Render Starter (1 service) | $7.00 |
| Frontend × 2 | Render Static Site (free) | $0.00 |
| Database | Supabase Free (500 MB) | $0.00 |
| **Total** | | **$7.00** |

**Limits**: 1 backend only, cold starts on free tier, 512 MB RAM, no custom domains on free tier, can't run multiple tenants.

---

## Proposed Setup (Hetzner VPS + Coolify)

### Infrastructure base cost (fixed, shared across all tenants)

| Component | Spec | Cost/month |
|-----------|------|-----------|
| Hetzner CX22 VPS | 2 vCPU, 4 GB RAM, 40 GB SSD | ~$4.53 |
| Coolify | Self-hosted (free) | $0.00 |
| Traefik proxy | Bundled with Coolify | $0.00 |
| Let's Encrypt SSL | Free | $0.00 |
| **Base infra** | | **~$4.53** |

### Database cost per tenant

| Option | Cost/month | Notes |
|--------|-----------|-------|
| Supabase Free | $0.00 | 500 MB, 2 projects max |
| Supabase Pro | $25.00 | 8 GB, unlimited projects |
| Supabase Pro (shared DB, schemas) | $25.00 flat | Multiple tenants, 1 project |
| Hetzner Managed DB (smallest) | ~$15.00 | PostgreSQL 16, 2 GB RAM |
| Self-hosted PostgreSQL on VPS | $0.00 | Uses VPS resources (no extra cost) |

*Recommendation: use Supabase Free per tenant while under 500 MB, share 1 Supabase Pro project with schema-per-tenant once you grow.*

---

## Monthly Cost by Number of Tenants

### Option A: Self-hosted PostgreSQL (on the same VPS)

Cheapest option. Works well for small databases (<5 GB total).

| Tenants | VPS | Supabase | SSL/DNS | **Total/month** | Cost per tenant |
|---------|-----|----------|---------|-----------------|-----------------|
| 1 | $4.53 (CX22) | $0 | $0 | **$4.53** | $4.53 |
| 5 | $4.53 (CX22) | $0 | $0 | **$4.53** | $0.91 |
| 10 | $8.95 (CX32) | $0 | $0 | **$8.95** | $0.90 |
| 20 | $17.55 (CX42) | $0 | $0 | **$17.55** | $0.88 |

*CX32 = 4 vCPU / 8 GB RAM at ~$8.95/mo. CX42 = 8 vCPU / 16 GB RAM at ~$17.55/mo.*

### Option B: Supabase Free (one project per tenant, up to 2 free)

| Tenants | VPS | Supabase | **Total/month** | Cost per tenant |
|---------|-----|----------|-----------------|-----------------|
| 1 | $4.53 | $0 | **$4.53** | $4.53 |
| 2 | $4.53 | $0 | **$4.53** | $2.27 |
| 5 | $4.53 | $75 (3 paid) | **$79.53** | $15.91 |
| 10 | $8.95 | $200 (8 paid) | **$208.95** | $20.90 |
| 20 | $17.55 | $450 (18 paid) | **$467.55** | $23.38 |

*Supabase Pro = $25/project/month. Not ideal for many tenants.*

### Option C: Supabase Pro shared (1 project, schema-per-tenant) — RECOMMENDED

| Tenants | VPS | Supabase Pro | **Total/month** | Cost per tenant |
|---------|-----|--------------|-----------------|-----------------|
| 1 | $4.53 | $25 | **$29.53** | $29.53 |
| 5 | $4.53 | $25 | **$29.53** | $5.91 |
| 10 | $8.95 | $25 | **$33.95** | $3.40 |
| 20 | $17.55 | $25 | **$42.55** | $2.13 |

---

## Full Cost Breakdown Comparison

### 5 Tenants

| Cost Item | Render | Hetzner + Coolify |
|-----------|--------|-------------------|
| Compute (backend × 5) | $35/mo (5 × Starter) | $4.53/mo (1 VPS) |
| Compute (frontend × 5) | $0/mo (static, free) | $0/mo (nginx on VPS) |
| Database × 5 | $0 (Supabase free, limited) | $25/mo (Supabase Pro shared) |
| SSL certificates | $0 (included) | $0 (Let's Encrypt) |
| Custom domains | $0 | $0 |
| Load balancer / proxy | included | $0 (Traefik) |
| CI/CD | $0 (GitHub Actions free tier) | $0 (GitHub Actions free tier) |
| **Total** | **$35/mo** | **$29.53/mo** |
| **Per tenant** | **$7.00** | **$5.91** |

### 10 Tenants

| Cost Item | Render | Hetzner + Coolify |
|-----------|--------|-------------------|
| Compute (backend × 10) | $70/mo | $8.95/mo (CX32) |
| Compute (frontend × 10) | $0/mo | $0/mo |
| Database × 10 | $0 (free, risky at scale) or $250 | $25/mo (shared Pro) |
| SSL + proxy | $0 | $0 |
| **Total (free DB)** | **$70/mo** | **$33.95/mo** |
| **Total (paid DB)** | **$320/mo** | **$33.95/mo** |
| **Per tenant (paid DB)** | **$32.00** | **$3.40** |

### 20 Tenants

| Cost Item | Render | Hetzner + Coolify |
|-----------|--------|-------------------|
| Compute (backend × 20) | $140/mo | $17.55/mo (CX42) |
| Compute (frontend × 20) | $0/mo | $0/mo |
| Database × 20 | $500/mo (20 × Pro) | $25/mo (shared Pro) |
| SSL + proxy | $0 | $0 |
| **Total** | **$640/mo** | **$42.55/mo** |
| **Per tenant** | **$32.00** | **$2.13** |

---

## Summary

| Scale | Render/month | Hetzner+Coolify/month | Savings |
|-------|--------------|-----------------------|---------|
| 1 tenant | $7 | $4.53 | 35% cheaper |
| 5 tenants | $35 | $29.53 | 16% cheaper |
| 10 tenants | $70–$320 | $33.95 | 51–89% cheaper |
| 20 tenants | $140–$640 | $42.55 | 70–93% cheaper |

### Key advantages of Hetzner + Coolify

- **No cold starts** — containers stay running permanently
- **Full isolation** — each tenant in its own container
- **Predictable costs** — VPS cost is fixed regardless of traffic
- **More RAM** — CX22 gives 4 GB RAM vs 512 MB on Render Starter
- **SSH access** — full server control
- **Coolify UI** — deploy, logs, metrics, env vars from a web dashboard
- **Automatic SSL** — Traefik + Let's Encrypt per domain

### When to stay on Render

- Only 1–2 tenants and you value simplicity over cost
- You don't want to manage a VPS at all (no ops overhead)
- Free tier cold starts are acceptable

### Migration path

1. Start with Hetzner CX22 ($4.53) + Coolify + self-hosted Postgres
2. When you hit 5+ paying tenants, move DB to Supabase Pro ($25 shared)
3. Upgrade VPS size as needed (CX32 at ~10 tenants, CX42 at ~20)
4. At 50+ tenants: consider Kubernetes (Hetzner k3s) for auto-scaling

---

*Prices sourced from Hetzner Cloud Console and Supabase pricing pages. Verify current prices before making decisions.*
