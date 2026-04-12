#!/usr/bin/env bash
##############################################################################
# backup-db.sh — PostgreSQL backup with S3 upload and retention policy
#
# Usage:
#   ./infra/scripts/backup-db.sh <tenant-slug>
#   ./infra/scripts/backup-db.sh zenko
#   ./infra/scripts/backup-db.sh --all       # backs up every tenant in index
#
# Requirements: pg_dump, gzip, aws (CLI), jq
# Schedule with cron: 0 2 * * * /opt/platform/infra/scripts/backup-db.sh --all
##############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# ── Global config (override via environment) ──────────────────────────────────
S3_BUCKET="${S3_BUCKET:-platform-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-https://s3.amazonaws.com}"
S3_REGION="${S3_REGION:-us-east-1}"
BACKUP_RETAIN_DAILY="${BACKUP_RETAIN_DAILY:-7}"
BACKUP_RETAIN_WEEKLY="${BACKUP_RETAIN_WEEKLY:-4}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/platform-backups}"
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
DOW=$(date -u +%u)   # 1=Monday … 7=Sunday

mkdir -p "$BACKUP_DIR"

# ── Check dependencies ────────────────────────────────────────────────────────
for cmd in pg_dump gzip aws; do
  command -v "$cmd" &>/dev/null || error "Required command not found: $cmd"
done

# ── Functions ─────────────────────────────────────────────────────────────────

backup_tenant() {
  local SLUG="$1"
  local TENANT_ENV="$INFRA_DIR/tenants/$SLUG/.env"

  [[ -f "$TENANT_ENV" ]] || { warn "No .env for tenant $SLUG at $TENANT_ENV — skipping."; return 0; }

  # Load tenant env (only extract DATABASE_URL to avoid polluting shell)
  local DB_URL
  DB_URL=$(grep -E "^[A-Z_]*DATABASE_URL=" "$TENANT_ENV" | head -1 | cut -d= -f2-)
  # Also accept SLUG_UPPER_DATABASE_URL format
  if [[ -z "$DB_URL" ]]; then
    local SLUG_UPPER="${SLUG^^}"
    SLUG_UPPER="${SLUG_UPPER//-/_}"
    DB_URL=$(grep "^${SLUG_UPPER}_DATABASE_URL=" "$TENANT_ENV" | head -1 | cut -d= -f2-)
  fi

  [[ -z "$DB_URL" ]] && { warn "DATABASE_URL not found for $SLUG — skipping."; return 0; }

  local FILENAME="${SLUG}_${TIMESTAMP}.sql.gz"
  local LOCAL_PATH="$BACKUP_DIR/$FILENAME"
  local S3_PREFIX="tenants/$SLUG"
  local S3_PATH="s3://$S3_BUCKET/$S3_PREFIX/$FILENAME"

  info "Backing up tenant: $SLUG → $FILENAME"

  # ── pg_dump + gzip ────────────────────────────────────────────────────────
  pg_dump \
    --no-password \
    --format=plain \
    --no-owner \
    --no-acl \
    "$DB_URL" \
    | gzip -9 > "$LOCAL_PATH"

  local SIZE
  SIZE=$(du -sh "$LOCAL_PATH" | cut -f1)
  success "Dump complete: $LOCAL_PATH ($SIZE)"

  # ── Upload to S3 ──────────────────────────────────────────────────────────
  info "Uploading to $S3_PATH..."
  aws s3 cp \
    --endpoint-url "$S3_ENDPOINT" \
    --region "$S3_REGION" \
    --storage-class STANDARD_IA \
    "$LOCAL_PATH" "$S3_PATH"

  success "Uploaded $FILENAME to S3"

  # ── Tag weekly backup ─────────────────────────────────────────────────────
  if [[ "$DOW" == "7" ]]; then   # Sunday = weekly backup
    local WEEKLY_NAME="${SLUG}_weekly_$(date -u +%Y_W%V).sql.gz"
    aws s3 cp \
      --endpoint-url "$S3_ENDPOINT" \
      --region "$S3_REGION" \
      "s3://$S3_BUCKET/$S3_PREFIX/$FILENAME" \
      "s3://$S3_BUCKET/$S3_PREFIX/weekly/$WEEKLY_NAME"
    success "Tagged as weekly: $WEEKLY_NAME"
  fi

  # ── Retention: purge old daily backups ────────────────────────────────────
  info "Applying retention policy (daily=$BACKUP_RETAIN_DAILY, weekly=$BACKUP_RETAIN_WEEKLY)..."

  # List daily backups sorted by date, skip the most recent N
  local DAILY_LIST
  DAILY_LIST=$(aws s3 ls \
    --endpoint-url "$S3_ENDPOINT" \
    --region "$S3_REGION" \
    "s3://$S3_BUCKET/$S3_PREFIX/" \
    | grep -v "^.*PRE " \
    | grep "${SLUG}_[0-9]" \
    | sort \
    | head -n "-${BACKUP_RETAIN_DAILY}" \
    | awk '{print $4}' || true)

  for OLD_FILE in $DAILY_LIST; do
    aws s3 rm \
      --endpoint-url "$S3_ENDPOINT" \
      --region "$S3_REGION" \
      "s3://$S3_BUCKET/$S3_PREFIX/$OLD_FILE"
    info "Deleted old daily backup: $OLD_FILE"
  done

  # Retain last N weekly backups
  local WEEKLY_LIST
  WEEKLY_LIST=$(aws s3 ls \
    --endpoint-url "$S3_ENDPOINT" \
    --region "$S3_REGION" \
    "s3://$S3_BUCKET/$S3_PREFIX/weekly/" \
    | grep -v "^.*PRE " \
    | sort \
    | head -n "-${BACKUP_RETAIN_WEEKLY}" \
    | awk '{print $4}' || true)

  for OLD_WEEKLY in $WEEKLY_LIST; do
    aws s3 rm \
      --endpoint-url "$S3_ENDPOINT" \
      --region "$S3_REGION" \
      "s3://$S3_BUCKET/$S3_PREFIX/weekly/$OLD_WEEKLY"
    info "Deleted old weekly backup: $OLD_WEEKLY"
  done

  # ── Cleanup local temp file ───────────────────────────────────────────────
  rm -f "$LOCAL_PATH"
  success "Backup complete for tenant: $SLUG"
}

# ── Main ──────────────────────────────────────────────────────────────────────
ARG="${1:-}"

if [[ "$ARG" == "--all" ]]; then
  TENANTS_INDEX="$INFRA_DIR/tenants/index.json"
  [[ -f "$TENANTS_INDEX" ]] || error "tenants/index.json not found. Run create-tenant.sh first."

  command -v jq &>/dev/null || error "jq is required for --all mode."

  SLUGS=$(jq -r '.tenants[].slug' "$TENANTS_INDEX")
  if [[ -z "$SLUGS" ]]; then
    warn "No tenants found in $TENANTS_INDEX"
    exit 0
  fi

  FAILED=0
  for SLUG in $SLUGS; do
    backup_tenant "$SLUG" || { warn "Backup FAILED for $SLUG"; FAILED=$((FAILED+1)); }
  done

  echo ""
  if [[ $FAILED -gt 0 ]]; then
    error "$FAILED backup(s) failed — check logs above."
  else
    success "All tenant backups completed successfully."
  fi

elif [[ -n "$ARG" ]]; then
  backup_tenant "$ARG"
else
  error "Usage: $0 <tenant-slug> | --all"
fi
