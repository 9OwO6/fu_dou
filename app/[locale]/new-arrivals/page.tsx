import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandEmptyMark } from "@/components/layout/brand-empty-mark";
import { ShowcaseGallery } from "@/components/showcase/showcase-gallery";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import { getActiveShowcaseDisplaySet, listPublicShowcaseItems, listShowcaseTags } from "@/lib/showcase/data";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ tag?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const messages = getMessages(locale).public.showcase;
  return {
    title: messages.title,
    description: messages.seoDescription,
    alternates: { canonical: `/${locale}/new-arrivals`, languages: { en: "/en/new-arrivals", zh: "/zh/new-arrivals" } },
  };
}

export default async function NewArrivalsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isSupportedLocale(locale)) notFound();
  const messages = getMessages(locale).public.showcase;
  const [allItems, tags] = await Promise.all([listPublicShowcaseItems(locale), listShowcaseTags(locale)]);
  const displaySet = await getActiveShowcaseDisplaySet(allItems);
  const activeTag = tags.some((tag) => tag.slug === query.tag) ? query.tag : undefined;
  const items = activeTag ? allItems.filter((item) => item.tags.some((tag) => tag.slug === activeTag)) : allItems;

  return (
    <main className="showcase-page">
      <section className="showcase-hero">
        <div className="store-container">
          <nav aria-label={getMessages(locale).public.common.breadcrumbLabel} className="breadcrumbs"><Link href={`/${locale}`}>{getMessages(locale).public.common.home}</Link><span>/</span><span aria-current="page">{messages.title}</span></nav>
          <p className="showcase-kicker">{messages.kicker}</p>
          <h1>{messages.title}</h1>
          <p>{messages.intro}</p>
          <div aria-label={messages.filterLabel} className="showcase-filter-row">
            <Link aria-current={!activeTag ? "page" : undefined} className={!activeTag ? "is-active" : ""} href={`/${locale}/new-arrivals`}>{messages.all}</Link>
            {tags.map((tag) => <Link aria-current={activeTag === tag.slug ? "page" : undefined} className={activeTag === tag.slug ? "is-active" : ""} href={`/${locale}/new-arrivals?tag=${encodeURIComponent(tag.slug)}`} key={tag.id}>{tag.name}</Link>)}
          </div>
        </div>
      </section>
      <section className="store-container showcase-content">
        <div className="showcase-result-row"><p><strong>{items.length}</strong> {messages.itemCount}</p><p>{messages.stockNotice}</p></div>
        {items.length ? <ShowcaseGallery displaySet={displaySet} items={items} labels={messages.gallery} locale={locale} /> : <div className="showcase-empty"><BrandEmptyMark /><h2>{messages.emptyTitle}</h2><p>{messages.emptyBody}</p><Link className="button-primary" href={`/${locale}/new-arrivals`}>{messages.clearFilter}</Link></div>}
      </section>
      <section className="showcase-contact" id="showcase-contact"><div className="store-container"><span aria-hidden="true">✦</span><div><h2>{messages.contactTitle}</h2><p>{messages.contactBody}</p></div></div></section>
    </main>
  );
}
