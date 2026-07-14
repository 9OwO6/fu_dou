import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPage } from "@/components/product/catalog-page";
import { collectionMatches, listPublicCategories, listPublicProducts } from "@/lib/catalog/public-data";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type CollectionSlug = "new" | "featured" | "sale";
function isCollectionSlug(value: string): value is CollectionSlug { return value === "new" || value === "featured" || value === "sale"; }
function collections(locale: "zh") {
  const messages = getMessages(locale).public.collections;
  return {
    new: { title: messages.newTitle, description: messages.newDescription },
    featured: { title: messages.featuredTitle, description: messages.featuredDescription },
    sale: { title: messages.saleTitle, description: messages.saleDescription },
  };
}
type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale) || !isCollectionSlug(slug)) return {};
  const item = collections(locale)[slug];
  return { title: item.title, description: item.description, alternates: { canonical: `/${locale}/collections/${slug}` } };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale) || !isCollectionSlug(slug)) notFound();
  const item = collections(locale)[slug];
  const [allProducts, categories] = await Promise.all([listPublicProducts(locale), listPublicCategories(locale)]);
  const products = allProducts.filter((product) => collectionMatches(product, slug));
  return <CatalogPage categories={categories} description={item.description} filters={{}} locale={locale} products={products} showFilters={false} title={item.title} />;
}
