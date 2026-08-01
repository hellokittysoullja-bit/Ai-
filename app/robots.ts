import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Служебные маршруты и само приложение (личное состояние в
      // localStorage, индексация бессмысленна) — вне индекса
      disallow: ["/api/", "/app"],
    },
    sitemap: "https://ai-rc-one.vercel.app/sitemap.xml",
  };
}
