# ECOS

Panel de administración para gestionar un ecosistema de cambio social: misiones, retos, agentes, proyectos, innovaciones, hallazgos, recomendaciones y territorios.

Construido con **Next.js 15** (App Router) + **Supabase** (PostgreSQL, Auth, Storage, Edge Functions). Frontend desplegado en **Vercel**.

---

## Requisitos

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Docker (para `supabase start` local)

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local   # (o crea .env.local manualmente)
# Rellena: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# 3. Supabase local (opcional)
supabase start

# 4. Dev server
npm run dev
```

App disponible en http://localhost:3000.

## Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run lint         # Lint con eslint de Next
npm run types:gen    # Regenera lib/supabase/database.types.ts (necesita SUPABASE_PROJECT_REF)
./deploy.sh          # Aplica migrations + despliega Edge Functions al Supabase remoto
```

## Estructura

- `app/` — Rutas (App Router). Panel en `/dashboard`, API en `/api`.
- `components/` — Componentes UI agrupados por entidad. Primitivos custom en `components/ui/`.
- `lib/` — Clientes Supabase, queries, schemas Zod, hooks, contexts, helpers de auth.
- `supabase/` — Migrations SQL, Edge Functions (Deno) y `config.toml`.
- `middleware.ts` — Autenticación + autorización por roles (`superadmin`, `gestor`, `usuario`).

## Despliegue

- **Frontend**: Vercel (push a `main` → build automático).
- **Backend**:
  - Manual: `./deploy.sh` desde local.
  - Automático: GitHub Actions (`.github/workflows/supabase-deploy.yml`) en push a `main` que toque `supabase/`.

## Roles

| Rol | Acceso |
|-----|--------|
| `superadmin` | Total al panel. Único que puede gestionar usuarios. |
| `gestor` | Acceso al panel con permisos a definir. |
| `usuario` | Solo parte pública, sin acceso al panel. |

## Trabajar con Claude Code

El repo incluye archivos de configuración para [Claude Code](https://claude.com/claude-code):

- [`CLAUDE.md`](CLAUDE.md) — Instrucciones principales del proyecto.
- `app/`, `components/`, `lib/`, `supabase/` — Cada carpeta tiene su propio `CLAUDE.md` con reglas locales.
- `.claude/agents/` — Subagentes especializados (`supabase-migrations`, `ecos-crud`).
- `.claude/commands/` — Slash commands (`/deploy`, `/types-gen`).
- `.claude/settings.json` — Permisos preautorizados para comandos frecuentes y seguros.

## Stack

- Next.js 15 · React 19 · TypeScript 5.6 · Tailwind 3.4
- Supabase (PostgreSQL 17, Auth, Storage, Edge Functions Deno)
- react-hook-form · Zod · @tanstack/react-table · recharts · lucide-react
- @anthropic-ai/sdk (insights con Claude)

## Licencia

Privado — UpSocial.
