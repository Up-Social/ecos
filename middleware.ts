import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PANEL_ROLES, type RoleKey } from "@/lib/auth/roles";

// =============================================================================
// Middleware con DOS PLANOS independientes (Fase 06):
//
//   · Plano ADMINISTRACIÓN → /admin/*, /dashboard/*, /api/*
//       Requiere sesión + PANEL_ROLES (superadmin/gestor).
//       Sin sesión → /admin/login.  Sin rol → /admin/login (API: 403 JSON).
//       Excepción: /admin/login es público (vive fuera del área guardada).
//
//   · Plano PÚBLICO → /, /login, /admin/login, /auth/callback
//       Acceso libre (sin sesión). Los usuarios públicos llegan en la Fase 07.
//
// Next.js permite un único archivo de middleware: la "independencia" se modela
// como ramas separadas (handleAdminPlane / plano público) sobre el mismo
// refresco de sesión de Supabase.
// =============================================================================

// Rutas públicas (sin requerir sesión).
const PUBLIC_PATHS = ["/", "/login", "/admin/login", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.filter((p) => p !== "/").some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/** Rutas del plano de administración que exigen PANEL_ROLES.
 *  /admin/login queda EXCLUIDA (es la puerta de acceso, debe ser pública). */
function isAdminPlane(pathname: string): boolean {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return false;
  }
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    isApiPath(pathname)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // PLANO ADMINISTRACIÓN
  // ---------------------------------------------------------------------------
  if (isAdminPlane(pathname)) {
    // 1. Sin sesión
    if (!user) {
      if (isApiPath(pathname)) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 2. Con sesión: comprobar PANEL_ROLES
    const { data: rolesRows } = await supabase
      .from("user_roles")
      .select("role_key")
      .eq("user_id", user.id);

    const roles = ((rolesRows ?? []) as { role_key: RoleKey }[]).map(
      (r) => r.role_key,
    );
    const hasPanelAccess = roles.some((r) => PANEL_ROLES.includes(r));

    if (!hasPanelAccess) {
      if (isApiPath(pathname)) {
        return NextResponse.json(
          { error: "Permisos insuficientes" },
          { status: 403 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("reason", "no_panel_access");
      return NextResponse.redirect(url);
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // PLANO PÚBLICO
  // ---------------------------------------------------------------------------

  // Usuario autenticado que visita una pantalla de login → al panel.
  if (user && (pathname === "/admin/login" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Resto de rutas públicas (incluida `/`): acceso libre.
  // `isPublicPath` se usa como guardia defensiva por si se añaden rutas nuevas.
  void isPublicPath(pathname);
  return response;
}

export const config = {
  matcher: [
    // Excluye estáticos, imágenes y favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
