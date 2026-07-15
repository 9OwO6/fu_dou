import Link from "next/link";

import { BrandEmptyMark } from "@/components/layout/brand-empty-mark";
import type { AppLocale } from "@/lib/i18n/config";
import type { PublicProduct } from "@/lib/catalog/public-data";
import { getMessages } from "@/lib/i18n/get-messages";

import { ProductCard } from "./product-card";

export function ProductGrid({ products, locale }: { products: PublicProduct[]; locale: AppLocale }) {
  const messages = getMessages(locale).public.catalog;
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <BrandEmptyMark />
        <h2>{messages.emptyTitle}</h2>
        <p>{messages.emptyBody}</p>
        <Link className="button-secondary" href={`/${locale}/products`}>{messages.emptyCta}</Link>
      </div>
    );
  }
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} locale={locale} product={product} />)}</div>;
}
