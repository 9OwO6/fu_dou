import Link from "next/link";

import type { AppLocale } from "@/lib/i18n/config";
import type { CatalogFilters, PublicCategory, PublicProduct } from "@/lib/catalog/public-data";
import { getMessages } from "@/lib/i18n/get-messages";

import { ProductGrid } from "./product-grid";

export function CatalogPage({
  locale,
  title,
  description,
  products,
  categories,
  filters,
  showFilters = true,
}: {
  locale: AppLocale;
  title: string;
  description: string;
  products: PublicProduct[];
  categories: PublicCategory[];
  filters: CatalogFilters;
  showFilters?: boolean;
}) {
  const messages = getMessages(locale).public;
  return (
    <main>
      <section className="catalog-hero">
        <div className="store-container">
          <nav aria-label={messages.common.breadcrumbLabel} className="breadcrumbs"><Link href={`/${locale}`}>{messages.common.home}</Link><span>/</span><span aria-current="page">{title}</span></nav>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="store-container catalog-content">
        <div className="catalog-heading-row">
          <p><strong>{products.length}</strong> {messages.catalog.countSuffix}</p>
          {filters.query ? <p>{messages.catalog.searchResult}：<strong>“{filters.query}”</strong></p> : null}
        </div>
        {showFilters ? (
          <form action={`/${locale}/products`} className="catalog-filters" method="get" role="search">
            <label>
              <span>{messages.catalog.search}</span>
              <input defaultValue={filters.query} name="q" placeholder={messages.catalog.searchPlaceholder} type="search" />
            </label>
            <label>
              <span>{messages.catalog.category}</span>
              <select defaultValue={filters.category ?? ""} name="category">
                <option value="">{messages.catalog.allCategories}</option>
                {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
              </select>
            </label>
            <label>
              <span>{messages.catalog.stock}</span>
              <select defaultValue={filters.stock ?? "all"} name="stock">
                <option value="all">{messages.catalog.allStatuses}</option>
                <option value="in">{messages.catalog.inStockOnly}</option>
              </select>
            </label>
            <label>
              <span>{messages.catalog.sort}</span>
              <select defaultValue={filters.sort ?? "new"} name="sort">
                <option value="new">{messages.catalog.newest}</option>
                <option value="price-asc">{messages.catalog.priceAsc}</option>
                <option value="price-desc">{messages.catalog.priceDesc}</option>
              </select>
            </label>
            <label className="filter-check"><input defaultChecked={filters.sale} name="sale" type="checkbox" value="1" /><span>{messages.catalog.saleOnly}</span></label>
            <button className="button-primary" type="submit">{messages.catalog.apply}</button>
            <Link className="filter-reset" href={`/${locale}/products`}>{messages.catalog.clear}</Link>
          </form>
        ) : null}
        <ProductGrid locale={locale} products={products} />
      </section>
    </main>
  );
}
