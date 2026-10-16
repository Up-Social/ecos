import { describe, expect, it } from "vitest";

// -----------------------------------------------------------------------------
// Smoke tests contra un despliegue real (local, preview o producción):
//
//   SMOKE_URL=https://… npm run test:smoke
//
// Solo hacen peticiones de lectura o que la validación rechaza antes de tocar
// datos u OpenAI: no crean, modifican ni borran nada. Para despliegues con
// Vercel Authentication, define VERCEL_AUTOMATION_BYPASS_SECRET.
// -----------------------------------------------------------------------------

const BASE = process.env.SMOKE_URL?.replace(/\/$/, "");
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

function pedir(ruta: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (BYPASS) headers.set("x-vercel-protection-bypass", BYPASS);
  return fetch(`${BASE}${ruta}`, { ...init, headers, redirect: "manual" });
}

function destino(res: Response) {
  const location = res.headers.get("location");
  if (!location) return null;
  const url = new URL(location, BASE);
  return url.pathname + url.search;
}

describe.skipIf(!BASE)(`despliegue en ${BASE}`, () => {
  describe("portal público", () => {
    it("sirve la portada", async () => {
      const res = await pedir("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("ECOS");
    });

    it("sirve /explorar y el listado de agentes", async () => {
      expect((await pedir("/explorar")).status).toBe(200);
      expect((await pedir("/explorar/agentes")).status).toBe(200);
    });

    it("sirve los logins", async () => {
      expect((await pedir("/login")).status).toBe(200);
      expect((await pedir("/admin/login")).status).toBe(200);
    });

    it("publica robots.txt bloqueando las áreas privadas y el sitemap", async () => {
      const robots = await pedir("/robots.txt");
      expect(robots.status).toBe(200);
      expect(await robots.text()).toMatch(/Disallow: \/dashboard/);
      const sitemap = await pedir("/sitemap.xml");
      expect(sitemap.status).toBe(200);
      expect(await sitemap.text()).toContain("<urlset");
    });

    it("carga la hoja de estilos compilada con Tailwind 4", async () => {
      const html = await (await pedir("/")).text();
      const hojas = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
      expect(hojas.length).toBeGreaterThan(0);
      const css = (await Promise.all(hojas.map(async (h) => (await pedir(h)).text()))).join("\n");
      expect(css).toMatch(/tailwindcss v4/);
    });
  });

  describe("proxy: protección de rutas", () => {
    it("manda al login del panel sin sesión", async () => {
      const res = await pedir("/dashboard");
      expect(res.status).toBe(307);
      expect(destino(res)).toBe("/admin/login?redirect=%2Fdashboard");
    });

    it("manda al login público las rutas privadas del portal", async () => {
      const res = await pedir("/perfil");
      expect(res.status).toBe(307);
      expect(destino(res)).toBe("/login?redirect=%2Fperfil");
    });

    it("responde 401 en JSON a las APIs del panel sin sesión", async () => {
      const res = await pedir("/api/users");
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "No autenticado" });
    });

    it("no deja pasar el cron de embeddings con un secreto falso", async () => {
      const res = await pedir("/api/embeddings", {
        headers: { authorization: "Bearer secreto-falso" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("validación (zod 4, mensajes en español)", () => {
    it("rechaza un mensaje vacío del asistente con un mensaje en español", async () => {
      const res = await pedir("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/se esperaba texto/);
    });

    it("rechaza una conversación con id no válido", async () => {
      const res = await pedir("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hola", conversationId: "x" }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Conversación no válida" });
    });

    it("rechaza una búsqueda vacía antes de llamar a OpenAI", async () => {
      const res = await pedir("/api/search?q=");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Escribe una consulta" });
    });
  });
});
