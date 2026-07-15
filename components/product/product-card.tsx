/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import type { AppLocale } from "@/lib/i18n/config";
import type { PublicProduct } from "@/lib/catalog/public-data";
import { getMessages } from "@/lib/i18n/get-messages";

export function ProductCard({ product, locale }: { product: PublicProduct; locale: AppLocale }) {
  const cad = new Intl.NumberFormat(locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" });
  const cover = product.images[0];
  const messages = getMessages(locale).public.common;
  return (
    <article className="product-card">
      <Link aria-label={messages.viewProduct.replace("{product}", product.title)} className="product-card-media" href={`/${locale}/products/${product.slug}`}>
        {cover?.url ? (
          <img alt={cover.alt} loading="lazy" src={cover.url} />
        ) : (
          <span className="product-placeholder">
            <Image alt="" src={logo} />
            <span>{messages.imagePreparing}</span>
          </span>
        )}
        <span className="product-badges">
          {product.isOnSale ? <span className="badge badge-sale">{messages.sale}</span> : null}
          {!product.hasStock ? <span className="badge badge-sold">{messages.soldOut}</span> : null}
          {product.newFrom ? <span className="badge badge-new">{messages.new}</span> : null}
        </span>
      </Link>
      <div className="product-card-body">
        <Link className="product-card-title" href={`/${locale}/products/${product.slug}`}>{product.title}</Link>
        {product.categories.length > 0 ? <p className="product-card-meta">{product.categories.map((category) => category.name).join(" · ")}</p> : null}
        <div className="product-price-row">
          <strong>{product.minimumPrice === product.maximumPrice ? cad.format(product.minimumPrice) : locale === "en" ? `${messages.from} ${cad.format(product.minimumPrice)}` : `${cad.format(product.minimumPrice)} ${messages.from}`}</strong>
          {product.compareAtPrice ? <del>{cad.format(product.compareAtPrice)}</del> : null}
        </div>
        <p className={product.hasStock ? "stock-in" : "stock-out"}>{product.hasStock ? messages.inStock : messages.temporarilySoldOut}</p>
      </div>
    </article>
  );
}
