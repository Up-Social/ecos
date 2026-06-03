#!/usr/bin/env bash
# =============================================================================
# rotate-secrets.sh — Rota e instala como SENSIBLES los secretos expuestos.
#
# Uso (tú, en tu terminal):
#   1) Rota primero las claves en cada proveedor (ver lista al final / chat).
#   2) Ejecuta:  bash scripts/rotate-secrets.sh
#   3) Pega cada VALOR NUEVO cuando te lo pida (entrada OCULTA; Enter vacío = saltar).
#
# El script:
#   - Sube cada secreto a Vercel como --sensitive (write-only) y --force (sobrescribe).
#   - Actualiza .env, .env.local y .env.deploy con el nuevo valor.
#   - NO imprime los valores en ningún momento.
#
# Requisitos: estar logueado en Vercel CLI (`vercel whoami`).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .vercel/project.json ]; then
  echo "✗ No encuentro .vercel/project.json. Ejecuta desde la raíz del proyecto." >&2
  exit 1
fi

# Forzar el scope del equipo (evita la colisión nombre personal/equipo).
export VERCEL_ORG_ID
export VERCEL_PROJECT_ID
VERCEL_ORG_ID=$(grep -o '"orgId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
VERCEL_PROJECT_ID=$(grep -o '"projectId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)

ENVFILES=(.env .env.local .env.deploy)

# Reemplaza (o crea) NAME=value en los .env locales, sin interpretar el valor.
update_envfiles() {
  local name="$1" val="$2" f tmp
  for f in "${ENVFILES[@]}"; do
    [ -f "$f" ] || touch "$f"
    tmp=$(mktemp)
    grep -v "^${name}=" "$f" > "$tmp" 2>/dev/null || true
    printf '%s=%s\n' "$name" "$val" >> "$tmp"
    mv "$tmp" "$f"
  done
  echo "  · .env / .env.local / .env.deploy → $name actualizado"
}

# Sube NAME a Vercel en los entornos indicados. flag = --sensitive | --no-sensitive
set_vercel() {
  local name="$1" val="$2" flag="$3"; shift 3
  local e
  for e in "$@"; do
    if printf '%s' "$val" | vercel env add "$name" "$e" "$flag" --force >/dev/null 2>&1; then
      echo "  · Vercel [$e] → $name ($flag) ✓"
    else
      echo "  ✗ Vercel [$e] → $name FALLÓ (hazlo en el dashboard para este entorno)"
    fi
  done
}

# Pide un valor de forma OCULTA. Devuelve vacío si el usuario salta.
ask() {
  local prompt="$1" val
  read -rsp "$prompt (Enter para saltar): " val
  echo "" >&2
  printf '%s' "$val"
}

echo "=== Rotación de secretos · proyecto ecos ==="
echo "Pega cada valor NUEVO (oculto). Enter vacío = no tocar esa clave."
echo

# 1) SUPABASE_SERVICE_ROLE_KEY (Production) — sensible
#    Pega aquí la NUEVA *Secret key* de Supabase (sb_secret_...).
V=$(ask "SUPABASE_SERVICE_ROLE_KEY = Secret key de Supabase (sb_secret_...)")
if [ -n "$V" ]; then
  echo "→ SUPABASE_SERVICE_ROLE_KEY"
  set_vercel SUPABASE_SERVICE_ROLE_KEY "$V" --sensitive production
  update_envfiles SUPABASE_SERVICE_ROLE_KEY "$V"
fi
unset V

# 2) OPENAI_API_KEY (Production + Development) — sensible
V=$(ask "OPENAI_API_KEY nuevo")
if [ -n "$V" ]; then
  echo "→ OPENAI_API_KEY"
  set_vercel OPENAI_API_KEY "$V" --sensitive production development
  update_envfiles OPENAI_API_KEY "$V"
fi
unset V

# 3) ANTHROPIC_API_KEY (Production + Preview + Development) — sensible
V=$(ask "ANTHROPIC_API_KEY nuevo")
if [ -n "$V" ]; then
  echo "→ ANTHROPIC_API_KEY"
  set_vercel ANTHROPIC_API_KEY "$V" --sensitive production preview development
  update_envfiles ANTHROPIC_API_KEY "$V"
fi
unset V

# 4) Publishable key → NEXT_PUBLIC_SUPABASE_ANON_KEY — PÚBLICA, NO sensible.
#    Al migrar a las keys nuevas, la anon se sustituye por la Publishable key.
echo
echo "Migración a keys nuevas de Supabase: la anon se reemplaza por la Publishable key."
V=$(ask "NEXT_PUBLIC_SUPABASE_ANON_KEY = Publishable key de Supabase (sb_publishable_...)")
if [ -n "$V" ]; then
  echo "→ NEXT_PUBLIC_SUPABASE_ANON_KEY (pública → NO sensible)"
  set_vercel NEXT_PUBLIC_SUPABASE_ANON_KEY "$V" --no-sensitive production preview development
  update_envfiles NEXT_PUBLIC_SUPABASE_ANON_KEY "$V"
  update_envfiles SUPABASE_ANON_KEY "$V"   # alias usado en .env.deploy
fi
unset V

echo
echo "=== Estado final de variables en Vercel ==="
vercel env ls 2>/dev/null | grep -iE "name|OPENAI|ANTHROPIC|SERVICE_ROLE|ANON|CRON" || true

echo
echo "Hecho. Ahora redespliega producción (tu script / dashboard) para que tome los nuevos valores."
