import type { MetadataRoute } from "next";

const SITE = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/business", "/api", "/cart", "/checkout", "/order", "/wishlist", "/track", "/media/invoice-logo-"],
    }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
