import type { MetadataRoute } from "next";

const BASE = "https://ai-rc-one.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/compare`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
