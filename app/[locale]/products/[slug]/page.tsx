import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductExperience } from "@/components/product/product-experience";
import { ProductGrid } from "@/components/product/product-grid";
import { getPublicProduct, listPublicProducts } from "@/lib/catalog/public-data";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string; slug: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) return {};
  const product = await getPublicProduct(locale, slug);
  if (!product) return {};
  return {
    title: product.seoTitle || product.title,
    description: product.seoDescription || product.shortDescription || product.description.slice(0, 160),
    alternates: { canonical: `/${locale}/products/${slug}` },
    openGraph: { title: product.seoTitle || product.title, description: product.seoDescription || product.shortDescription, images: product.images[0]?.url ? [{ url: product.images[0].url, alt: product.images[0].alt }] : [] },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const messages = getMessages(locale).public;
  const product = await getPublicProduct(locale, slug);
  if (!product) notFound();
  const related = (await listPublicProducts(locale)).filter((item) => item.id !== product.id && item.categories.some((category) => product.categories.some((current) => current.id === category.id))).slice(0, 4);
  return (
    <main>
      <div className="store-container product-detail-wrap">
        <nav aria-label="面包屑" className="breadcrumbs"><Link href={`/${locale}`}>{messages.common.home}</Link><span>/</span><Link href={`/${locale}/products`}>{messages.common.allProducts}</Link><span>/</span><span aria-current="page">{product.title}</span></nav>
        <ProductExperience locale={locale} messages={messages.product} product={product} />
        <section className="product-description"><h2>{messages.product.detailsTitle}</h2><p>{product.description || messages.product.detailsFallback}</p>{product.categories.length > 0 ? <div className="detail-categories"><strong>{messages.product.categories}</strong>{product.categories.map((category) => <Link href={`/${locale}/categories/${category.slug}`} key={category.id}>{category.name}</Link>)}</div> : null}</section>
        <section className="related-products"><div className="section-heading"><div><h2>{messages.product.relatedTitle}</h2><p>{messages.product.relatedBody}</p></div><Link className="section-link" href={`/${locale}/products`}>{messages.common.viewAll}</Link></div><ProductGrid locale={locale} products={related} /></section>
      </div>
    </main>
  );
}
