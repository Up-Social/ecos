// Configuración plana de ESLint (Next 16 retiró `next lint`).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Deuda previa: el lint no se ejecutaba antes de Next 16. Se dejan como
    // avisos para no bloquear `npm run lint` hasta corregirlos.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Edge Functions de Supabase: runtime Deno, fuera del proyecto Next.
    "supabase/functions/**",
    // Worktrees locales de Claude Code (copias del repo con su node_modules).
    ".claude/**",
  ]),
]);
