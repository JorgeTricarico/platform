#!/usr/bin/env bash
# render-status.sh — Quick visibility into Render services
# Usage: bash scripts/render-status.sh [command]
# Commands: status (default), deploys, logs, env

set -euo pipefail

# Load token from backend/.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RENDER_API_TOKEN="${RENDER_API_TOKEN:-$(grep RENDER_API_TOKEN "$SCRIPT_DIR/../backend/.env" | cut -d'"' -f2)}"

if [ -z "$RENDER_API_TOKEN" ]; then
  echo "ERROR: RENDER_API_TOKEN not found in backend/.env"
  exit 1
fi

# Service IDs
BACKEND_ID="srv-d78t7c94tr6s73cggik0"
ZENKO_ID="srv-d79sjinkijhs73937rc0"
DAMIAN_ID="srv-d78t9c450q8c73f6g1k0"

API="https://api.render.com/v1"
AUTH="Authorization: Bearer $RENDER_API_TOKEN"

cmd="${1:-status}"

case "$cmd" in
  status)
    echo "=== Render Services Status ==="
    echo ""
    for name_id in "platform-backend:$BACKEND_ID" "zenko-app:$ZENKO_ID" "damian-app:$DAMIAN_ID"; do
      name="${name_id%%:*}"
      id="${name_id##*:}"
      data=$(curl -s -H "$AUTH" "$API/services/$id")
      status=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('suspended','active') if d.get('suspended')=='suspended' else 'active')" 2>/dev/null || echo "unknown")
      updated=$(echo "$data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('updatedAt','?')[:19])" 2>/dev/null || echo "?")
      url=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('serviceDetails',{}).get('url', '?'))" 2>/dev/null || echo "?")
      printf "%-20s %-10s %-20s %s\n" "$name" "$status" "$updated" "$url"
    done
    ;;

  deploys)
    echo "=== Last 3 Deploys per Service ==="
    for name_id in "platform-backend:$BACKEND_ID" "zenko-app:$ZENKO_ID" "damian-app:$DAMIAN_ID"; do
      name="${name_id%%:*}"
      id="${name_id##*:}"
      echo ""
      echo "--- $name ---"
      curl -s -H "$AUTH" "$API/services/$id/deploys?limit=3" | python3 -c "
import sys, json
items = json.load(sys.stdin)
if isinstance(items, list) and items:
    for item in items:
        d = item.get('deploy', item)
        status = d.get('status', '?')
        created = d.get('createdAt', '?')[:19]
        commit = d.get('commit') or {}
        msg = commit.get('message', '?').split('\n')[0][:60]
        print(f'  {status:<16} {created}  {msg}')
else:
    print('  No deploys found')
" 2>/dev/null || echo "  (error fetching deploys)"
    done
    ;;

  logs)
    service="${2:-backend}"
    case "$service" in
      backend) id="$BACKEND_ID" ;;
      zenko)   id="$ZENKO_ID" ;;
      damian)  id="$DAMIAN_ID" ;;
      *)       echo "Unknown service: $service (use backend/zenko/damian)"; exit 1 ;;
    esac
    echo "=== Recent Logs: $service ==="
    curl -s -H "$AUTH" "$API/services/$id/logs?limit=50" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    for entry in data:
        ts = entry.get('timestamp', '')[:19]
        msg = entry.get('message', '')
        print(f'{ts} {msg}')
else:
    print(json.dumps(data, indent=2))
" 2>/dev/null || echo "(error fetching logs)"
    ;;

  env)
    service="${2:-backend}"
    case "$service" in
      backend) id="$BACKEND_ID" ;;
      zenko)   id="$ZENKO_ID" ;;
      damian)  id="$DAMIAN_ID" ;;
      *)       echo "Unknown service: $service"; exit 1 ;;
    esac
    echo "=== Env Vars: $service ==="
    curl -s -H "$AUTH" "$API/services/$id/env-vars" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    for v in data:
        key = v.get('envVar', v).get('key', '?') if isinstance(v, dict) else v
        val = v.get('envVar', v).get('value', '***') if isinstance(v, dict) else '?'
        # Mask sensitive values
        if any(s in key.upper() for s in ['SECRET', 'PASSWORD', 'TOKEN', 'KEY']):
            val = val[:4] + '...' + val[-4:] if len(val) > 8 else '****'
        print(f'  {key}={val}')
else:
    print(json.dumps(data, indent=2))
" 2>/dev/null || echo "(error fetching env vars)"
    ;;

  *)
    echo "Usage: bash scripts/render-status.sh [status|deploys|logs|env] [service]"
    echo "  status           — Overview of all 3 services"
    echo "  deploys          — Last 3 deploys per service"
    echo "  logs [service]   — Recent logs (backend/zenko/damian)"
    echo "  env [service]    — Environment variables (masked)"
    ;;
esac
