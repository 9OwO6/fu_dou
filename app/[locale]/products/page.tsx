import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPage } from "@/components/product/catalog-page";
import { listPublicCategories, listPublicProducts, type CatalogFilters } from "@/lib/catalog/public-data";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const messages = getMessages(locale).public.catalog;
  return { title: messages.allTitle, description: messages.allSeoDescription, alternates: { canonical: `/${locale}/products`, languages: { en: "/en/products", zh: "/zh/products" } } };
}

type SearchParams = Promise<{ q?: string; category?: string; stock?: string; sale?: string; sort?: string }>;

export default async function ProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const messages = getMessages(locale).public.catalog;
  const query = await searchParams;
  const filters: CatalogFilters = {
    query: query.q,
    category: query.category,
    stock: query.stock === "in" ? "in" : "all",
    sale: query.sale === "1",
    sort: query.sort === "price-asc" || query.sort === "price-desc" ? query.sort : "new",
  };
  const [products, categories] = await Promise.all([listPublicProducts(locale, filters), listPublicCategories(locale)]);
  return <CatalogPage categories={categories} description={messages.allDescription} filters={filters} locale={locale} products={products} title={messages.allTitle} />;
}
