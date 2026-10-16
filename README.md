# ECOS

Panel de administración para gestionar un ecosistema de cambio social: misiones, retos, agentes, proyectos, innovaciones, hallazgos, recomendaciones y territorios.

Construido con **Next.js 16** (App Router) + **Supabase** (PostgreSQL, Auth, Storage, Edge Functions). Frontend desplegado en **Vercel**.

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
#         SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

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
npm run lint         # ESLint (config plana eslint.config.mjs)
npm test             # Pruebas unitarias (Vitest)
SMOKE_URL=https://… npm run test:smoke  # Smoke tests de solo lectura contra un despliegue
npm run types:gen    # Regenera lib/supabase/database.types.ts (necesita SUPABASE_PROJECT_REF)
./deploy.sh          # Aplica migrations + despliega Edge Functions al Supabase remoto
```

## Estructura

- `app/` — Rutas (App Router). Panel en `/dashboard`, API en `/api`.
- `components/` — Componentes UI agrupados por entidad. Primitivos custom en `components/ui/`.
- `lib/` — Clientes Supabase, queries, schemas Zod, hooks, contexts, helpers de auth.
- `supabase/` — Migrations SQL, Edge Functions (Deno) y `config.toml`.
- `proxy.ts` — Autenticación + autorización por roles (`superadmin`, `gestor`, `usuario`).

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

- Node.js 24 LTS · Next.js 16 (webpack) · React 19 · TypeScript 5.9 · Tailwind 4
- Supabase (PostgreSQL 17, Auth, Storage, Edge Functions Deno)
- react-hook-form · Zod 4 · @tanstack/react-table 9 · recharts · lucide-react

**Por qué TypeScript sigue en 5.9**: Next 16.4 ya admite TypeScript 7 (el build usa el `tsc` del
proyecto y el proyecto compila con 7.0), pero `typescript-eslint`, que llega con
`eslint-config-next`, aún no lo soporta (peer `<6.1.0`; con 7.0 `npm run lint` aborta) y el
plugin de Next para el editor necesita la API JavaScript que TypeScript 7 todavía no publica.
Revisar cuando `typescript-eslint` admita TypeScript 7.

**Override de `fast-glob`**: `@next/eslint-plugin-next` fija `fast-glob@3.3.1`, que arrastra
`braces` con un aviso alto sin versión corregida. Solo usa `globSync(…, { onlyDirectories })`,
así que `package.json` lo sustituye por `tinyglobby` (misma función, sin `braces`).
- openai (`gpt-6-luna` para chat e insights; `text-embedding-3-small` para embeddings)

## Licencia

Privado — UpSocial.
