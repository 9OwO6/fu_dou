import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPage } from "@/components/product/catalog-page";
import { listPublicCategories, listPublicProducts } from "@/lib/catalog/public-data";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) return {};
  const category = (await listPublicCategories(locale)).find((item) => item.slug === slug);
  const description = getMessages(locale).public.catalog.categorySeoDescription.replace("{category}", category?.name ?? "");
  if (!category) return {};
  const otherLocale = locale === "en" ? "zh" : "en";
  const otherCategory = (await listPublicCategories(otherLocale)).some((item) => item.slug === slug);
  const languages = otherCategory
    ? { [locale]: `/${locale}/categories/${slug}`, [otherLocale]: `/${otherLocale}/categories/${slug}` }
    : { [locale]: `/${locale}/categories/${slug}` };
  return { title: category.name, description: category.description || description, alternates: { canonical: `/${locale}/categories/${slug}`, languages } };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const categories = await listPublicCategories(locale);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const products = await listPublicProducts(locale, { category: slug });
  const description = getMessages(locale).public.catalog.categoryDescription.replace("{category}", category.name);
  return <CatalogPage categories={categories} description={category.description || description} filters={{ category: slug }} locale={locale} products={products} showFilters={false} title={category.name} />;
}
