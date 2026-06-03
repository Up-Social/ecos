import type { MetadataRoute } from "next";

// =============================================================================
// robots.txt — permite el portal público y bloquea las áreas privadas.
// =============================================================================

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
