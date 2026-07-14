/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import applePlate from "@/assets/products/苹果盘子.jpg";
import bearCup from "@/assets/products/小熊杯子.jpg";
import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import { ProductGrid } from "@/components/product/product-grid";
import { collectionMatches, listPublicCategories, listPublicProducts, type PublicProduct } from "@/lib/catalog/public-data";
import { getPublicHomepageConfiguration } from "@/lib/homepage/data";
import type { HomepageSection, ProductSectionType } from "@/lib/homepage/schema";
import { isSupportedLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "可爱家居与礼物",
  description: "浏览 Happy Beans 福豆的新品、推荐、特价、杯具、餐具和可爱家居小物。",
  alternates: { canonical: "/zh" },
};

function resolveHref(locale: string, href: string) {
  if (!href) return `/${locale}/products`;
  return href.startsWith("#") ? `/${locale}${href}` : `/${locale}${href}`;
}

function productsForSection(section: HomepageSection, products: PublicProduct[]) {
  const mode = section.settings.selectionMode ?? "automatic";
  const limit = section.settings.limit ?? 4;
  if (mode === "manual") {
    const byId = new Map(products.map((product) => [product.id, product]));
    return (section.settings.productIds ?? []).flatMap((id) => byId.get(id) ?? []).slice(0, limit);
  }
  const collection = ({
    new_products: "new",
    featured_products: "featured",
    sale_products: "sale",
  } as const)[section.sectionType as ProductSectionType];
  return products.filter((product) => collectionMatches(product, collection)).slice(0, limit);
}

function selectedImage(section: HomepageSection, products: PublicProduct[]) {
  const imageId = section.settings.imageId;
  if (!imageId) return null;
  return products.flatMap((product) => product.images).find((image) => image.id === imageId && image.url) ?? null;
}

export default async function StorefrontHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const [configuration, products, categories] = await Promise.all([
    getPublicHomepageConfiguration(),
    listPublicProducts(locale),
    listPublicCategories(locale),
  ]);
  const firstContentType = configuration.sections.find((section) => section.sectionType !== "announcement")?.sectionType;

  return (
    <main>
      {configuration.sections.map((section) => {
        const { translation } = section;
        const Heading = firstContentType === section.sectionType ? "h1" : "h2";
        if (section.sectionType === "announcement") return null;
        if (section.sectionType === "hero") {
          const image = selectedImage(section, products);
          return (
            <section className="hero-section" key={section.sectionType}>
              <div className="store-container hero-grid">
                <div className="hero-copy">
                  <Heading>{translation.heading}</Heading><p>{translation.body}</p>
                  {translation.ctaLabel ? <div className="hero-actions"><Link className="button-primary" href={resolveHref(locale, translation.ctaHref)}>{translation.ctaLabel}</Link><Link className="button-secondary" href={`/${locale}/products`}>全部商品</Link></div> : null}
                </div>
                <div aria-label="Happy Beans 真实商品与品牌图片" className="hero-visual">
                  <Image alt="Happy Beans 福豆" className="hero-brand-mark" priority src={logo} />
                  <div className="hero-photo hero-photo-main">{image?.url ? <img alt={image.alt} className="h-full w-full object-cover" src={image.url} /> : <Image alt="苹果造型餐盘" fill priority sizes="(max-width: 767px) 70vw, 35vw" src={applePlate} />}</div>
                  <div className="hero-photo hero-photo-small"><Image alt="小熊玻璃杯" fill sizes="(max-width: 767px) 45vw, 22vw" src={bearCup} /></div>
                </div>
              </div>
            </section>
          );
        }
        if (section.sectionType === "featured_categories") {
          const byId = new Map(categories.map((category) => [category.id, category]));
          const selected = section.settings.categoryIds?.length
            ? section.settings.categoryIds.flatMap((id) => byId.get(id) ?? [])
            : categories.slice(0, 6);
          return (
            <section className="home-section" key={section.sectionType}>
              <div className="store-container"><div className="section-heading"><div><Heading>{translation.heading}</Heading><p>{translation.body}</p></div><Link className="section-link" href={`/${locale}/products`}>查看全部</Link></div>
                {selected.length > 0 ? <div className="category-grid">{selected.map((category, index) => <Link className="category-card" href={`/${locale}/categories/${category.slug}`} key={category.id}><span aria-hidden="true" className="category-symbol">{["☕", "⌂", "✿", "✎", "♡", "◡"][index % 6]}</span><span>{category.name}</span></Link>)}</div> : <div className="empty-state"><h2>热门分类正在整理</h2><p>可以先从全部商品开始浏览。</p><Link className="button-secondary" href={`/${locale}/products`}>查看全部商品</Link></div>}
              </div>
            </section>
          );
        }
        if (section.sectionType === "new_products" || section.sectionType === "featured_products" || section.sectionType === "sale_products") {
          const tone = section.sectionType === "featured_products" ? " home-section-blue" : section.sectionType === "sale_products" ? " home-section-pink" : "";
          const selected = productsForSection(section, products);
          return (
            <section className={`home-section${tone}`} key={section.sectionType}>
              <div className="store-container"><div className="section-heading"><div><Heading>{translation.heading}</Heading><p>{translation.body}</p></div>{translation.ctaHref ? <Link className="section-link" href={resolveHref(locale, translation.ctaHref)}>{translation.ctaLabel || "查看全部"}</Link> : null}</div><ProductGrid locale={locale} products={selected} /></div>
            </section>
          );
        }
        if (section.sectionType === "brand_story") {
          const image = selectedImage(section, products);
          return <section className="home-section" id="brand-story" key={section.sectionType}><div className="store-container story-grid"><div className="story-copy"><Heading>{translation.heading}</Heading><p>{translation.body}</p></div><div className="story-image">{image?.url ? <img alt={image.alt} className="h-full w-full object-cover" src={image.url} /> : <Image alt="苹果造型餐盘" src={applePlate} />}</div></div></section>;
        }
        if (section.sectionType === "fulfillment") {
          const content = translation.content;
          const panels = [
            configuration.siteSettings.pickupEnabled ? { title: content.pickupTitle, body: content.pickupBody } : null,
            configuration.siteSettings.localDeliveryEnabled ? { title: content.deliveryTitle, body: content.deliveryBody } : null,
          ].filter((panel): panel is { title: string; body: string } => Boolean(panel?.title && panel.body));
          return <section className="home-section home-section-blue" id="fulfillment" key={section.sectionType}><div className="store-container"><div className="section-heading"><div><Heading>{translation.heading}</Heading><p>{translation.body}</p>{configuration.siteSettings.serviceAreaDescription ? <p>{configuration.siteSettings.serviceAreaDescription}</p> : null}</div></div>{panels.length > 0 ? <div className="info-grid">{panels.map((panel) => <article className="info-panel" key={panel.title}><h3>{panel.title}</h3><p>{panel.body}</p></article>)}</div> : <div className="empty-state"><h2>履约安排正在更新</h2><p>提交订单请求前，请等待店主确认最新安排。</p></div>}</div></section>;
        }
        if (section.sectionType === "faq") {
          const items = translation.content.items ?? [];
          return <section className="home-section" id="faq" key={section.sectionType}><div className="store-container"><div className="section-heading"><div><Heading>{translation.heading}</Heading><p>{translation.body}</p></div></div><div className="faq-list">{items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>;
        }
        if (section.sectionType === "contact_cta") {
          const contactHref = configuration.siteSettings.contactEmail ? `mailto:${configuration.siteSettings.contactEmail}` : resolveHref(locale, translation.ctaHref);
          return <section className="home-section" key={section.sectionType}><div className="store-container contact-band"><div><Heading>{translation.heading}</Heading><p>{translation.body}</p>{configuration.siteSettings.contactEmail ? <p><a href={`mailto:${configuration.siteSettings.contactEmail}`}>{configuration.siteSettings.contactEmail}</a>{configuration.siteSettings.contactPhone ? ` · ${configuration.siteSettings.contactPhone}` : ""}</p> : null}</div>{translation.ctaLabel ? <a className="button-primary" href={contactHref}>{translation.ctaLabel}</a> : null}</div></section>;
        }
        return null;
      })}
    </main>
  );
}
