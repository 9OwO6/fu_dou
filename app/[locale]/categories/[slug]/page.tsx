import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPage } from "@/components/product/catalog-page";
import { listPublicCategories, listPublicProducts } from "@/lib/catalog/public-data";
import { isSupportedLocale } from "@/lib/i18n/config";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) return {};
  const category = (await listPublicCategories(locale)).find((item) => item.slug === slug);
  return category ? { title: category.name, description: category.description || `浏览${category.name}分类商品。`, alternates: { canonical: `/${locale}/categories/${slug}` } } : {};
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const categories = await listPublicCategories(locale);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const products = await listPublicProducts(locale, { category: slug });
  return <CatalogPage categories={categories} description={category.description || `这里收集了属于“${category.name}”的公开商品。`} filters={{ category: slug }} locale={locale} products={products} showFilters={false} title={category.name} />;
}
