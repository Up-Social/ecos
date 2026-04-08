import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PANEL_ROLES, type RoleKey } from "@/lib/auth/roles";

// -----------------------------------------------------------------------------
// Middleware de autenticación + autorización por roles.
// - Refresca la sesión de Supabase en cada request.
// - Redirige a /login si no hay usuario y la ruta requiere auth.
// - Redirige a /login si el usuario está autenticado pero no tiene un rol
//   con acceso al panel (superadmin o gestor) cuando intenta entrar a
//   /dashboard. Para /api/* devuelve 403 en el mismo caso.
// -----------------------------------------------------------------------------

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPanelPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
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
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 1. No autenticado → /login (excepto rutas públicas)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Autenticado entrando a /login → al panel
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 3. Autenticado: comprobar roles solo en rutas del panel o API
  if (user && (isPanelPath(pathname) || isApiPath(pathname))) {
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
      url.pathname = "/login";
      url.searchParams.set("reason", "no_panel_access");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Excluye estáticos, imágenes y favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
