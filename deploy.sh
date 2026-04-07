#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# deploy.sh — Despliegue local de ECOS a Supabase remoto
#
# Aplica las migraciones SQL pendientes y despliega todas las Edge Functions
# en el proyecto de Supabase remoto.
#
# Uso:
#   ./deploy.sh
#
# Variables de entorno requeridas (puedes ponerlas en un fichero .env.deploy
# en la raíz del proyecto, que este script cargará automáticamente):
#
#   SUPABASE_PROJECT_REF   Reference ID del proyecto (Settings → General)
#   SUPABASE_DB_PASSWORD   Contraseña de la base de datos (Settings → Database)
#   SUPABASE_ACCESS_TOKEN  (opcional) Token personal — solo si no estás logueado
#                          con `supabase login`. Crear en:
#                          https://supabase.com/dashboard/account/tokens
# -----------------------------------------------------------------------------

set -euo pipefail

# Colores para los logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}▶${NC} $*"; }
ok()     { echo -e "${GREEN}✓${NC} $*"; }
warn()   { echo -e "${YELLOW}⚠${NC} $*"; }
err()    { echo -e "${RED}✗${NC} $*" >&2; }

# Movernos al directorio del script (raíz del proyecto)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# -----------------------------------------------------------------------------
# 1. Cargar variables de entorno desde .env.deploy si existe
# -----------------------------------------------------------------------------
if [[ -f ".env.deploy" ]]; then
  log "Cargando variables desde .env.deploy"
  set -a
  # shellcheck disable=SC1091
  source .env.deploy
  set +a
fi

# -----------------------------------------------------------------------------
# 2. Validar requisitos
# -----------------------------------------------------------------------------
if ! command -v supabase >/dev/null 2>&1; then
  err "Supabase CLI no encontrado. Instálalo con: brew install supabase/tap/supabase"
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  err "Falta la variable SUPABASE_PROJECT_REF"
  err "Defínela en .env.deploy o expórtala antes de ejecutar este script."
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  err "Falta la variable SUPABASE_DB_PASSWORD"
  exit 1
fi

export SUPABASE_DB_PASSWORD
[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] && export SUPABASE_ACCESS_TOKEN

# -----------------------------------------------------------------------------
# 3. Vincular proyecto (idempotente: ignora error si ya está linkeado)
# -----------------------------------------------------------------------------
log "Vinculando con el proyecto remoto ($SUPABASE_PROJECT_REF)"
if supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null 2>&1; then
  ok "Proyecto vinculado"
else
  warn "El link devolvió un aviso (probablemente ya estaba vinculado). Continuando."
fi

# -----------------------------------------------------------------------------
# 4. Aplicar migraciones SQL pendientes
# -----------------------------------------------------------------------------
log "Aplicando migraciones SQL (supabase db push)"
supabase db push
ok "Migraciones aplicadas"

# -----------------------------------------------------------------------------
# 5. Desplegar todas las Edge Functions
# -----------------------------------------------------------------------------
if [[ -d "supabase/functions" ]]; then
  # Lista de funciones (carpetas dentro de supabase/functions)
  FUNCTIONS=()
  for dir in supabase/functions/*/; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    # Saltar la carpeta especial _shared si existe
    [[ "$name" == "_shared" ]] && continue
    FUNCTIONS+=("$name")
  done

  if [[ ${#FUNCTIONS[@]} -eq 0 ]]; then
    warn "No se encontraron Edge Functions para desplegar"
  else
    for fn in "${FUNCTIONS[@]}"; do
      log "Desplegando función: $fn"
      supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF"
      ok "Desplegada: $fn"
    done
  fi
else
  warn "Directorio supabase/functions no existe — sin funciones que desplegar"
fi

# -----------------------------------------------------------------------------
echo
ok "Despliegue completo. Supabase remoto al día ✨"
