import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Simula @supabase/ssr: el cliente "refresca" la sesión (llama a setAll con una
// cookie nueva y las cabeceras anti-caché) y devuelve el usuario y los roles
// que fije cada prueba.
const m = vi.hoisted(() => ({
  user: null as { id: string } | null,
  roles: [] as string[],
  mustChangePassword: false,
  refrescar: true,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opciones: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: Record<string, unknown> }[],
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      getUser: async () => {
        if (m.refrescar) {
          opciones.cookies.setAll(
            [{ name: "sb-test-auth-token", value: "nuevo", options: { path: "/", httpOnly: true } }],
            { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" },
          );
        }
        return { data: { user: m.user } };
      },
    },
    from: (tabla: string) => {
      const consulta = {
        select: () => consulta,
        eq: () => (tabla === "user_roles" ? Promise.resolve({ data: m.roles.map((role_key) => ({ role_key })) }) : consulta),
        maybeSingle: async () => ({ data: { must_change_password: m.mustChangePassword } }),
      };
      return consulta;
    },
  }),
}));

import { proxy } from "./proxy";

function peticion(ruta: string, cabeceras?: Record<string, string>) {
  return new NextRequest(new URL(ruta, "http://localhost:3000"), { headers: cabeceras });
}

beforeEach(() => {
  m.user = null;
  m.roles = [];
  m.mustChangePassword = false;
  m.refrescar = true;
  vi.stubEnv("CRON_SECRET", "secreto");
});

describe("proxy: refresco de sesión", () => {
  it("una redirección conserva la cookie renovada y las cabeceras anti-caché", async () => {
    const res = await proxy(peticion("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login?redirect=%2Fdashboard");
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("nuevo");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("un 401 de API también lleva la cookie y no es cacheable", async () => {
    const res = await proxy(peticion("/api/users"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "No autenticado" });
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("nuevo");
    expect(res.headers.get("pragma")).toBe("no-cache");
  });

  it("sin refresco no añade cabeceras anti-caché", async () => {
    m.refrescar = false;
    const res = await proxy(peticion("/"));
    expect(res.headers.get("cache-control")).toBeNull();
  });
});

describe("proxy: planos admin y público", () => {
  it("deja pasar el portal y las APIs públicas sin sesión", async () => {
    for (const ruta of ["/", "/explorar", "/login", "/admin/login", "/api/search", "/api/chat"]) {
      const res = await proxy(peticion(ruta));
      expect(res.headers.get("x-middleware-next"), ruta).toBe("1");
    }
  });

  it("deja pasar el cron de embeddings solo con el secreto", async () => {
    const conSecreto = await proxy(peticion("/api/embeddings", { authorization: "Bearer secreto" }));
    expect(conSecreto.headers.get("x-middleware-next")).toBe("1");
    const sinSecreto = await proxy(peticion("/api/embeddings", { authorization: "Bearer otro" }));
    expect(sinSecreto.status).toBe(401);
  });

  it("manda al login público las rutas protegidas del portal", async () => {
    const res = await proxy(peticion("/perfil"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?redirect=%2Fperfil");
  });

  it("sin rol de panel: 403 en API y vuelta al login admin en páginas", async () => {
    m.user = { id: "u1" };
    m.roles = ["usuario"];
    expect((await proxy(peticion("/api/users"))).status).toBe(403);
    const res = await proxy(peticion("/dashboard"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login?reason=no_panel_access");
  });

  it("con rol de panel entra al dashboard", async () => {
    m.user = { id: "u1" };
    m.roles = ["gestor"];
    const res = await proxy(peticion("/dashboard"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("retiene en /cambiar-password a quien debe cambiarla", async () => {
    m.user = { id: "u1" };
    m.roles = ["gestor"];
    m.mustChangePassword = true;
    const res = await proxy(peticion("/dashboard"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/cambiar-password");
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("nuevo");
  });
});
