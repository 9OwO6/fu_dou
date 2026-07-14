import type { MetadataRoute } from "next";

import { listPublicCategories, listPublicProducts } from "@/lib/catalog/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticPaths = ["/zh", "/zh/products", "/zh/collections/new", "/zh/collections/featured", "/zh/collections/sale"];
  try {
    const [products, categories] = await Promise.all([listPublicProducts("zh"), listPublicCategories("zh")]);
    return [
      ...staticPaths.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "/zh" ? 1 : 0.8 })),
      ...categories.map((category) => ({ url: `${baseUrl}/zh/categories/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...products.map((product) => ({ url: `${baseUrl}/zh/products/${product.slug}`, lastModified: new Date(product.publishedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticPaths.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "weekly", priority: path === "/zh" ? 1 : 0.8 }));
  }
}
