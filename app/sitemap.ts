import type { MetadataRoute } from "next";

import { listPublicCategories, listPublicProducts } from "@/lib/catalog/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticSuffixes = ["", "/products", "/collections/new", "/collections/featured", "/collections/sale"];
  const staticPaths = (["en", "zh"] as const).flatMap((locale) => staticSuffixes.map((suffix) => `/${locale}${suffix}`));
  try {
    const [productsEn, productsZh, categoriesEn, categoriesZh] = await Promise.all([
      listPublicProducts("en"), listPublicProducts("zh"), listPublicCategories("en"), listPublicCategories("zh"),
    ]);
    return [
      ...staticPaths.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "/en" || path === "/zh" ? 1 : 0.8 })),
      ...categoriesEn.map((category) => ({ url: `${baseUrl}/en/categories/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...categoriesZh.map((category) => ({ url: `${baseUrl}/zh/categories/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...productsEn.map((product) => ({ url: `${baseUrl}/en/products/${product.slug}`, lastModified: new Date(product.publishedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
      ...productsZh.map((product) => ({ url: `${baseUrl}/zh/products/${product.slug}`, lastModified: new Date(product.publishedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticPaths.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "weekly", priority: path === "/en" || path === "/zh" ? 1 : 0.8 }));
  }
}
