#!/usr/bin/env bash
# =============================================================================
# sync-secrets-to-vercel.sh
#
# Toma los valores YA correctos de .env.local (fuente de verdad tras la rotación)
# y los sincroniza:
#   - A Vercel, con la sensibilidad correcta por variable.
#   - A .env y .env.deploy (consistencia local).
#
# NO imprime ningún valor. Requiere estar logueado en Vercel CLI.
#
# Mapeo de keys nuevas de Supabase:
#   SUPABASE_SERVICE_ROLE_KEY      = Secret key      (sb_secret_...)   [sensible]
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  = Publishable key (sb_publishable_) [pública]
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .vercel/project.json ] || { echo "✗ Falta .vercel/project.json"; exit 1; }
[ -f .env.local ] || { echo "✗ Falta .env.local"; exit 1; }

export VERCEL_ORG_ID VERCEL_PROJECT_ID
VERCEL_ORG_ID=$(grep -o '"orgId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
VERCEL_PROJECT_ID=$(grep -o '"projectId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)

SYNC_FILES=(.env .env.deploy)   # .env.local es la fuente; no se reescribe

getval() { grep -m1 "^$1=" .env.local | cut -d= -f2- | tr -d '\r' | sed -E 's/^"(.*)"$/\1/'; }

update_envfiles() {  # name value  → reescribe la línea en .env y .env.deploy
  local name="$1" val="$2" f tmp
  for f in "${SYNC_FILES[@]}"; do
    [ -f "$f" ] || touch "$f"
    tmp=$(mktemp)
    grep -v "^${name}=" "$f" > "$tmp" 2>/dev/null || true
    printf '%s=%s\n' "$name" "$val" >> "$tmp"
    mv "$tmp" "$f"
  done
}

push() {  # name flag env1 env2 ...   (valor leído de .env.local)
  local name="$1" flag="$2"; shift 2
  local val e
  val=$(getval "$name")
  if [ -z "$val" ]; then echo "  ✗ $name ausente en .env.local — saltado"; return; fi
  for e in "$@"; do
    if printf '%s' "$val" | vercel env add "$name" "$e" "$flag" --force >/dev/null 2>&1; then
      echo "  · Vercel [$e] $name ($flag) ✓"
    else
      echo "  ✗ Vercel [$e] $name FALLÓ — revísalo en el dashboard"
    fi
  done
  update_envfiles "$name" "$val"
  echo "  · .env/.env.deploy $name sincronizado"
}

echo "=== Sincronizando secretos .env.local → Vercel ==="
echo "→ SUPABASE_SERVICE_ROLE_KEY (Secret key, sensible)"
push SUPABASE_SERVICE_ROLE_KEY --sensitive production

echo "→ NEXT_PUBLIC_SUPABASE_ANON_KEY (Publishable, pública)"
push NEXT_PUBLIC_SUPABASE_ANON_KEY --no-sensitive production preview development
# alias usado en .env.deploy
update_envfiles SUPABASE_ANON_KEY "$(getval NEXT_PUBLIC_SUPABASE_ANON_KEY)"

echo "→ OPENAI_API_KEY (sensible)"
push OPENAI_API_KEY --sensitive production development

echo "→ ANTHROPIC_API_KEY (sensible)"
push ANTHROPIC_API_KEY --sensitive production preview development

echo
echo "=== Estado final en Vercel ==="
vercel env ls 2>/dev/null | grep -iE "name|OPENAI|ANTHROPIC|SERVICE_ROLE|ANON|CRON" || true
echo
echo "Hecho. Siguiente: redesplegar producción y luego DESACTIVAR las keys legacy en Supabase."
