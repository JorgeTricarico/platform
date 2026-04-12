#!/usr/bin/env bash
##############################################################################
# deploy-tenant.sh — Build and deploy Docker images for a specific tenant
#
# Usage:
#   ./infra/scripts/deploy-tenant.sh <slug> <environment> [options]
#
# Examples:
#   ./infra/scripts/deploy-tenant.sh zenco dev
#   ./infra/scripts/deploy-tenant.sh zenco prod --tag v1.2.3
#   ./infra/scripts/deploy-tenant.sh mg-masajes staging --no-push
#
# Environments:
#   dev      — build only, no push, start with docker compose
#   staging  — build, push to GHCR, trigger Coolify webhook
#   prod     — build, push to GHCR, tag :latest, trigger Coolify webhook
#
# Requirements: docker, docker buildx, gh (GitHub CLI), curl, jq
##############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()    { echo -e "\n${CYAN}══ $* ══${NC}"; }

# ── Parse args ────────────────────────────────────────────────────────────────
SLUG="${1:-}"
ENV="${2:-dev}"
CUSTOM_TAG=""
NO_PUSH=false
COOLIFY_DEPLOY=true

shift 2 2>/dev/null || true

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)       CUSTOM_TAG="$2"; shift 2 ;;
    --no-push)   NO_PUSH=true; shift ;;
    --no-deploy) COOLIFY_DEPLOY=false; shift ;;
    *) error "Unknown option: $1" ;;
  esac
done

[[ -z "$SLUG" ]] && error "Usage: $0 <tenant-slug> <env> [--tag <tag>] [--no-push] [--no-deploy]"
[[ "$ENV" =~ ^(dev|staging|prod)$ ]] || error "Environment must be: dev | staging | prod"

# ── Locate files ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$INFRA_DIR")"

TENANT_ENV_FILE="$INFRA_DIR/tenants/$SLUG/.env"
[[ "$ENV" != "dev" && ! -f "$TENANT_ENV_FILE" ]] && \
  error "Missing env file: $TENANT_ENV_FILE. Run create-tenant.sh first."

# Load tenant env if it exists
[[ -f "$TENANT_ENV_FILE" ]] && source "$TENANT_ENV_FILE"

# ── Derive config ─────────────────────────────────────────────────────────────
GITHUB_ORG="${GITHUB_ORG:-your-org}"
REGISTRY="ghcr.io/$GITHUB_ORG"

# Compute image tag
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "local")
IMAGE_TAG="${CUSTOM_TAG:-${GIT_SHA}}"

BACKEND_IMAGE="$REGISTRY/platform-backend"
WEB_IMAGE="$REGISTRY/platform-web-$SLUG"

VITE_TENANT="${VITE_TENANT:-$SLUG}"
VITE_API_URL="${VITE_API_URL:-https://api.${SLUG}.yourplatform.com}"
TENANT_PATH="clients/$SLUG"

info "Deploying tenant: $SLUG  (env=$ENV  tag=$IMAGE_TAG)"

# ── Step 1: Authenticate with GHCR ────────────────────────────────────────────
if [[ "$NO_PUSH" == "false" && "$ENV" != "dev" ]]; then
  step "Authenticating with GHCR"
  if command -v gh &>/dev/null; then
    gh auth token | docker login ghcr.io -u "$GITHUB_ORG" --password-stdin
    success "Logged in to ghcr.io"
  else
    warn "gh CLI not found. Ensure GHCR_TOKEN is set and you are already logged in."
  fi
fi

# ── Step 2: Build backend image ───────────────────────────────────────────────
step "Building backend image"
docker buildx build \
  --platform linux/amd64 \
  --file "$INFRA_DIR/docker/Dockerfile.backend" \
  --target runner \
  --tag "$BACKEND_IMAGE:$IMAGE_TAG" \
  --label "org.opencontainers.image.revision=$GIT_SHA" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "platform.tenant=$SLUG" \
  ${NO_PUSH:+} \
  "$REPO_ROOT"

success "Built $BACKEND_IMAGE:$IMAGE_TAG"

# ── Step 3: Build web image ───────────────────────────────────────────────────
step "Building web image (tenant=$VITE_TENANT)"
docker buildx build \
  --platform linux/amd64 \
  --file "$INFRA_DIR/docker/Dockerfile.web" \
  --target runner \
  --build-arg "VITE_TENANT=$VITE_TENANT" \
  --build-arg "VITE_API_URL=$VITE_API_URL" \
  --build-arg "TENANT_PATH=$TENANT_PATH" \
  --tag "$WEB_IMAGE:$IMAGE_TAG" \
  --label "org.opencontainers.image.revision=$GIT_SHA" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "platform.tenant=$SLUG" \
  ${NO_PUSH:+} \
  "$REPO_ROOT"

success "Built $WEB_IMAGE:$IMAGE_TAG"

# ── Step 4: Push to registry ──────────────────────────────────────────────────
if [[ "$NO_PUSH" == "false" && "$ENV" != "dev" ]]; then
  step "Pushing images to GHCR"
  docker push "$BACKEND_IMAGE:$IMAGE_TAG"
  docker push "$WEB_IMAGE:$IMAGE_TAG"
  success "Pushed $IMAGE_TAG"

  # Also tag :latest on prod
  if [[ "$ENV" == "prod" ]]; then
    docker tag "$BACKEND_IMAGE:$IMAGE_TAG" "$BACKEND_IMAGE:latest"
    docker tag "$WEB_IMAGE:$IMAGE_TAG"     "$WEB_IMAGE:latest"
    docker push "$BACKEND_IMAGE:latest"
    docker push "$WEB_IMAGE:latest"
    success "Tagged and pushed :latest"
  fi
else
  info "Skipping push (NO_PUSH=$NO_PUSH  env=$ENV)"
fi

# ── Step 5: Trigger Coolify deployment ────────────────────────────────────────
if [[ "$COOLIFY_DEPLOY" == "true" && "$ENV" != "dev" ]]; then
  step "Triggering Coolify deployment"

  COOLIFY_URL="${COOLIFY_URL:-}"
  COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:-}"
  COOLIFY_APP_UUID="${COOLIFY_APP_UUID:-}"  # Set per-tenant in .env

  if [[ -z "$COOLIFY_URL" || -z "$COOLIFY_API_TOKEN" ]]; then
    warn "COOLIFY_URL or COOLIFY_API_TOKEN not set — skipping Coolify trigger."
    warn "Set them in $TENANT_ENV_FILE or export them before running this script."
  else
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$COOLIFY_URL/api/v1/deploy" \
      -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"uuid\": \"$COOLIFY_APP_UUID\", \"tag\": \"$IMAGE_TAG\"}")

    if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
      success "Coolify deployment triggered (HTTP $HTTP_STATUS)"
    else
      warn "Coolify API returned HTTP $HTTP_STATUS — check Coolify dashboard manually."
    fi
  fi
fi

# ── Step 6: Dev local startup ─────────────────────────────────────────────────
if [[ "$ENV" == "dev" ]]; then
  step "Starting local dev environment"
  docker compose \
    -f "$INFRA_DIR/docker-compose.yml" \
    --env-file "$INFRA_DIR/.env" \
    up -d
  success "Dev environment started. Access:"
  echo "  Backend: http://localhost:${PORT:-3000}"
  echo "  Web:     http://localhost:${WEB_PORT:-5173}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
success "Deploy complete: $SLUG @ $ENV ($IMAGE_TAG)"
echo ""
echo "  Backend image: $BACKEND_IMAGE:$IMAGE_TAG"
echo "  Web image:     $WEB_IMAGE:$IMAGE_TAG"
[[ "$ENV" != "dev" ]] && echo "  Public URL:    https://${TRAEFIK_HOST:-$SLUG.yourplatform.com}"
echo ""
