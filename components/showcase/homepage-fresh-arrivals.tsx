/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { BrandEmptyMark } from "@/components/layout/brand-empty-mark";
import type { AppLocale } from "@/lib/i18n/config";
import type { PublicShowcaseItem } from "@/lib/showcase/data";
import { groupPublicShowcaseItems } from "@/lib/showcase/grouping";

type HomepageFreshArrivalsLabels = {
  unnamed: string;
  askPrice: string;
  inquiry: string;
  sold: string;
  imageCount: string;
  newDrop: string;
  stylesCount: string;
  emptyTitle: string;
  emptyBody: string;
  viewAll: string;
};

export function HomepageFreshArrivals({
  items,
  labels,
  locale,
}: {
  items: PublicShowcaseItem[];
  labels: HomepageFreshArrivalsLabels;
  locale: AppLocale;
}) {
  const href = `/${locale}/new-arrivals`;
  const cad = new Intl.NumberFormat(locale === "zh" ? "zh-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  });
  const entries = groupPublicShowcaseItems(items);

  if (!items.length) {
    return (
      <div className="home-fresh-empty">
        <BrandEmptyMark />
        <h3>{labels.emptyTitle}</h3>
        <p>{labels.emptyBody}</p>
        <Link className="button-secondary" href={href}>{labels.viewAll}</Link>
      </div>
    );
  }

  return (
    <div className="home-fresh-grid" data-count={entries.length}>
      {entries.map((entry, index) => {
        const item = entry.featuredItem;
        const cover = item.images[0];
        const title = entry.group?.name || item.title || labels.unnamed;
        return (
          <article className="home-fresh-card" key={entry.key}>
            <Link aria-label={`${title} · ${item.shortCode}`} href={href}>
              <span className="home-fresh-media">
                {cover?.signedUrl ? <img alt={cover.altText} loading={index < 2 ? "eager" : "lazy"} src={cover.signedUrl} /> : <span className="showcase-image-fallback" />}
                <span className="home-fresh-drop">{labels.newDrop}</span>
                {item.images.length > 1 ? <span className="home-fresh-count">{labels.imageCount.replace("{count}", String(item.images.length))}</span> : null}
                {entry.group && entry.group.members.length > 1 ? <span className="home-fresh-style-count">{labels.stylesCount.replace("{count}", String(entry.group.members.length))}</span> : null}
                {item.availability === "sold" ? <span className="showcase-sold-stamp">{labels.sold}</span> : null}
              </span>
              <span className="home-fresh-copy">
                <span className="home-fresh-code">{item.shortCode}</span>
                <strong>{title}</strong>
                <span className="home-fresh-price">{item.priceCad === null ? labels.askPrice : cad.format(item.priceCad)}</span>
                <span className="home-fresh-status">{item.availability === "sold" ? labels.sold : labels.inquiry}</span>
                {entry.group && entry.group.members.length > 1 ? <span className="home-fresh-style-labels">{entry.group.members.slice(0, 3).map((member) => member.label).join(" · ")}</span> : null}
                {item.tags.length ? <span className="home-fresh-tags">{item.tags.slice(0, 2).map((tag) => <span key={tag.id}>{tag.name}</span>)}</span> : null}
              </span>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
