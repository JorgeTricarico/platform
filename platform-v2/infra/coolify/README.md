# Coolify on Hetzner — Setup Guide

This guide walks through setting up Coolify on a Hetzner VPS and deploying platform tenants.

---

## Table of Contents

1. [Hetzner VPS Provisioning](#1-hetzner-vps-provisioning)
2. [Coolify Installation](#2-coolify-installation)
3. [First-Time Coolify Configuration](#3-first-time-coolify-configuration)
4. [Docker Registry (GHCR)](#4-docker-registry-ghcr)
5. [Deploying Your First Tenant](#5-deploying-your-first-tenant)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [SSL / Custom Domains](#7-ssl--custom-domains)
8. [Adding More Tenants](#8-adding-more-tenants)
9. [Monitoring and Logs](#9-monitoring-and-logs)
10. [Backup Configuration](#10-backup-configuration)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Hetzner VPS Provisioning

### Recommended specs

| Tenants | VPS type | vCPU | RAM   | Disk   | Monthly (EUR) |
|---------|----------|------|-------|--------|---------------|
| 1–3     | CX22     | 2    | 4 GB  | 40 GB  | ~4.15 €       |
| 4–8     | CX32     | 4    | 8 GB  | 80 GB  | ~8.21 €       |
| 9–20    | CX42     | 8    | 16 GB | 160 GB | ~16.09 €      |

### Steps

1. Log in to [Hetzner Cloud Console](https://console.hetzner.cloud).
2. Create a new project: **Platform**.
3. Add a server:
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (or larger)
   - **Region**: pick closest to your clients
   - **SSH key**: add your public key
   - **Firewall**: allow TCP 22, 80, 443, 8000 (Coolify UI)
4. Note the server IP.

### Firewall rules (Hetzner Cloud Firewall)

| Direction | Protocol | Port | Source          | Description          |
|-----------|----------|------|-----------------|----------------------|
| Inbound   | TCP      | 22   | Your IP only    | SSH                  |
| Inbound   | TCP      | 80   | Any             | HTTP (redirect only) |
| Inbound   | TCP      | 443  | Any             | HTTPS                |
| Inbound   | TCP      | 8000 | Your IP only    | Coolify dashboard    |
| Outbound  | Any      | Any  | Any             | Allow all outbound   |

---

## 2. Coolify Installation

SSH into your VPS and run the official one-liner:

```bash
ssh root@YOUR_SERVER_IP

curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Installation takes ~2 minutes. When done, Coolify is available at:
`http://YOUR_SERVER_IP:8000`

> **Tip**: Set up a DNS A record `coolify.yourplatform.com → YOUR_SERVER_IP` and point Coolify UI to that domain for a proper SSL-secured dashboard.

---

## 3. First-Time Coolify Configuration

1. Open `http://YOUR_SERVER_IP:8000` and create the admin account.
2. **Add server**:
   - Settings → Servers → Add Server
   - Choose "Localhost" (Coolify is on the same VPS)
   - Validate the connection
3. **Configure proxy** (Traefik):
   - Settings → Proxy → Enable Traefik
   - Set Let's Encrypt email: `admin@yourplatform.com`
   - Deploy proxy
4. **Create a project**:
   - Projects → New Project → Name: "Platform Tenants"
5. **Add storage** (for backups):
   - Settings → Storages → Add S3-compatible storage
   - Fill in your S3/R2/B2 credentials

---

## 4. Docker Registry (GHCR)

Images are built by GitHub Actions and pushed to GitHub Container Registry.

### Authenticate Coolify with GHCR

1. Create a GitHub PAT with `read:packages` scope:
   `GitHub → Settings → Developer Settings → Personal Access Tokens`
2. In Coolify: Settings → Registries → Add Registry
   - Type: GitHub Container Registry
   - Username: your GitHub username
   - Password: the PAT

### Configure GitHub repository secrets

In your GitHub repo: Settings → Secrets and Variables → Actions

```
GHCR_TOKEN          = GitHub PAT with write:packages
COOLIFY_URL         = https://coolify.yourplatform.com
COOLIFY_API_TOKEN   = (generate in Coolify → Profile → API tokens)
```

---

## 5. Deploying Your First Tenant

### Step A — Create tenant config

```bash
# From repo root
./platform-v2/infra/scripts/create-tenant.sh zenko \
  --domain zenko.yourplatform.com \
  --port-offset 1

cp platform-v2/infra/tenants/zenko/.env.template \
   platform-v2/infra/tenants/zenko/.env

# Edit the .env — fill in DATABASE_URL, JWT_SECRET, etc.
nano platform-v2/infra/tenants/zenko/.env
```

### Step B — Run Prisma migrations

```bash
DATABASE_URL="postgresql://..." \
  npx prisma migrate deploy \
  --schema backend/prisma/schema.prisma
```

### Step C — Build and push images

```bash
./platform-v2/infra/scripts/deploy-tenant.sh zenko prod
# This builds, tags, and pushes to GHCR, then triggers Coolify.
```

### Step D — Create service in Coolify (first deploy only)

1. Open Coolify → Projects → Platform Tenants → Add Service
2. Choose **Docker Compose**
3. Source: **GitHub** → select your repo
4. Compose path: `platform-v2/infra/tenants/zenko/docker-compose.yml`
5. Environment Variables: copy from `platform-v2/infra/tenants/zenko/.env`
6. Domains:
   - `zenko.yourplatform.com` → service `web-zenko`, port 80
   - `api.zenko.yourplatform.com` → service `backend-zenko`, port 3000
7. Click **Deploy**

Coolify will pull the images, start containers, configure Traefik, and issue SSL certs automatically.

---

## 6. Environment Variables Reference

All variables are documented in `platform-v2/infra/.env.example`.

Key variables for each tenant (`platform-v2/infra/tenants/<slug>/.env`):

| Variable | Description | Example |
|----------|-------------|---------|
| `TENANT` | Tenant slug | `zenko` |
| `{SLUG}_DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `{SLUG}_JWT_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -base64 48` |
| `VITE_TENANT` | Matches clients/ folder | `zenko` |
| `VITE_API_URL` | Backend URL baked into the frontend | `https://api.zenko.yourplatform.com` |
| `IMAGE_TAG` | Docker image tag to deploy | `latest` or git SHA |
| `TRAEFIK_HOST` | Public hostname for this tenant | `zenko.yourplatform.com` |
| `COOLIFY_APP_UUID` | Coolify service UUID (for API deploys) | from Coolify UI |

---

## 7. SSL / Custom Domains

Coolify uses Traefik + Let's Encrypt. SSL is automatic when:

1. The domain's DNS A record points to your Hetzner VPS IP.
2. Port 80 and 443 are open.
3. The `traefik.http.routers.*.tls.certresolver: letsencrypt` label is set (already in the compose templates).

### Custom tenant domain

If a client has their own domain (e.g. `app.mymasagebusiness.com`):

1. Ask them to add a DNS A record: `app.mymasagebusiness.com → YOUR_SERVER_IP`
2. In Coolify: edit the service → Domains → add `app.mymasagebusiness.com`
3. Coolify re-deploys Traefik config and issues the cert.

---

## 8. Adding More Tenants

Each new tenant is isolated in its own containers:

```bash
# 1. Create tenant config
./platform-v2/infra/scripts/create-tenant.sh mg-masajes \
  --domain mgmasajes.yourplatform.com \
  --port-offset 2

# 2. Fill in .env
cp platform-v2/infra/tenants/mg-masajes/.env.template \
   platform-v2/infra/tenants/mg-masajes/.env
# edit it...

# 3. Run migrations for this tenant's DB
DATABASE_URL="postgresql://..." npx prisma migrate deploy ...

# 4. Build & push images
./platform-v2/infra/scripts/deploy-tenant.sh mg-masajes prod

# 5. In Coolify: Add Service → Docker Compose → mg-masajes compose file
```

Resource usage per tenant (production, minimal load):
- Backend: ~100–200 MB RAM, 0.1–0.2 vCPU
- Web (nginx): ~20–30 MB RAM, negligible CPU
- Total per tenant: ~150–250 MB RAM

On a CX22 (4 GB RAM) you can comfortably run **8–10 tenants**.

---

## 9. Monitoring and Logs

**Container logs** — in Coolify UI: Service → Logs  
**Resource usage** — Coolify UI: Server → Resources  
**Alerts** — Coolify UI: Settings → Notifications (Slack/Discord/Email)

View logs from CLI:
```bash
# SSH into VPS
docker logs backend-zenko --tail=100 -f
docker logs web-zenko --tail=50
```

---

## 10. Backup Configuration

### Option A — Coolify built-in backups

Coolify supports scheduled PostgreSQL backups to S3-compatible storage.  
Configure at: Service → Backups → Enable.

### Option B — Script (recommended for flexibility)

Add a cron job on the VPS:

```bash
# SSH into VPS, edit crontab
crontab -e

# Add:
0 2 * * * /opt/platform/platform-v2/infra/scripts/backup-db.sh --all >> /var/log/platform-backup.log 2>&1
```

The backup script:
- Dumps each tenant's DB with `pg_dump`
- Compresses with gzip
- Uploads to S3
- Keeps last 7 daily + 4 weekly backups
- Deletes older files automatically

---

## 11. Troubleshooting

**Container fails to start**
```bash
docker logs backend-zenko
# Common causes: DATABASE_URL wrong, JWT_SECRET missing, Prisma migration needed
```

**SSL cert not issued**
- Check DNS: `dig zenko.yourplatform.com` should return your VPS IP
- Verify ports 80/443 are open
- Check Traefik logs: `docker logs coolify-proxy`

**Database connection refused**
- Verify `DATABASE_URL` is correct and the DB allows connections from the VPS IP
- For Supabase: use the **pooler** URL (port 6543), not direct (port 5432), and add `?pgbouncer=true&connection_limit=1`

**Image not found on GHCR**
- Ensure the GitHub Actions CI ran and pushed the image
- Check image visibility in GitHub → Packages (must be public or GHCR auth configured in Coolify)

**Out of memory**
- Add a swap file: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`
- Upgrade to CX32

---

*Generated by Platform infrastructure setup. Update this doc as the setup evolves.*
