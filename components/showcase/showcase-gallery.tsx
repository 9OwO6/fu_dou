/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicShowcaseItem, ShowcaseDisplaySet, ShowcaseItemEntry } from "@/lib/showcase/data";
import { groupPublicShowcaseItems } from "@/lib/showcase/grouping";

type CopyState = "idle" | "copied" | "failed";

export function ShowcaseGallery({
  displaySet,
  items,
  locale,
  labels,
}: {
  displaySet: ShowcaseDisplaySet;
  items: PublicShowcaseItem[];
  locale: "en" | "zh";
  labels: {
    unnamed: string;
    askPrice: string;
    inquiry: string;
    sold: string;
    imageCount: string;
    close: string;
    previous: string;
    next: string;
    copyCode: string;
    copied: string;
    copyFailed: string;
    stageKicker: string;
    stageTitle: string;
    stageCount: string;
    moreTitle: string;
    moreBody: string;
    styleOptions: string;
    stylesCount: string;
  };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeItem, setActiveItem] = useState<PublicShowcaseItem | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!activeItem || activeItem.images.length < 2) return;
      if (event.key === "ArrowLeft") setActiveImage((current) => (current - 1 + activeItem.images.length) % activeItem.images.length);
      if (event.key === "ArrowRight") setActiveImage((current) => (current + 1) % activeItem.images.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeItem]);

  function open(item: PublicShowcaseItem) {
    setActiveItem(item);
    setActiveImage(0);
    setCopyState("idle");
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    dialogRef.current?.close();
    setActiveItem(null);
  }

  async function copyCode() {
    if (!activeItem) return;
    try {
      await navigator.clipboard.writeText(activeItem.shortCode);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const rank = new Map(displaySet.itemIds.map((id, index) => [id, index]));
  const entries = groupPublicShowcaseItems(items);
  const entryRank = (entry: ShowcaseItemEntry) => Math.min(...entry.items.map((item) => rank.get(item.id) ?? Number.POSITIVE_INFINITY));
  const stagedEntries = entries.filter((entry) => Number.isFinite(entryRank(entry))).sort((a, b) => entryRank(a) - entryRank(b));
  const hasStage = stagedEntries.length >= 2;
  const stagedKeys = new Set(hasStage ? stagedEntries.map((entry) => entry.key) : []);
  const remainingEntries = entries.filter((entry) => !stagedKeys.has(entry.key));

  function card(entry: ShowcaseItemEntry, index: number, inStage: boolean) {
    const item = entry.items.find((candidate) => candidate.id === styleSelections[entry.key]) ?? entry.featuredItem;
    const group = entry.group;
    const cover = item.images[0];
    const title = group?.name || item.title || labels.unnamed;
    const featured = inStage && entry.items.some((candidate) => candidate.id === displaySet.featuredItemId);
    return (
      <article className={`showcase-card ${inStage ? "is-stage-card" : ""} ${featured ? "is-featured" : ""} ${group ? "is-style-group" : ""}`} key={entry.key} style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
        <button aria-label={`${title} · ${item.shortCode}`} className="showcase-card-open" onClick={() => open(item)} type="button">
          <span className="showcase-card-media">
            {cover?.signedUrl ? <img alt={cover.altText} loading={inStage && index < 6 ? "eager" : "lazy"} src={cover.signedUrl} /> : <span className="showcase-image-fallback" />}
            {item.images.length > 1 ? <span className="showcase-image-count">{labels.imageCount.replace("{count}", String(item.images.length))}</span> : null}
            {group && group.members.length > 1 ? <span className="showcase-style-count">{labels.stylesCount.replace("{count}", String(group.members.length))}</span> : null}
            {item.availability === "sold" ? <span className="showcase-sold-stamp">{labels.sold}</span> : null}
          </span>
          <span className="showcase-card-copy">
            <span className="showcase-card-code">{item.shortCode}</span>
            <strong>{title}</strong>
            <span className="showcase-card-price">{item.priceCad ? new Intl.NumberFormat(locale === "zh" ? "zh-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(item.priceCad) : labels.askPrice}</span>
            <span className="showcase-card-status">{item.availability === "sold" ? labels.sold : labels.inquiry}</span>
          </span>
        </button>
        {group && entry.items.length > 1 ? <div aria-label={labels.styleOptions} className="showcase-style-options" role="group">{entry.items.map((styleItem) => {
          const member = group.members.find((candidate) => candidate.itemId === styleItem.id);
          return <button aria-pressed={styleItem.id === item.id} key={styleItem.id} onClick={() => setStyleSelections((current) => ({ ...current, [entry.key]: styleItem.id }))} type="button">{member?.label || labels.unnamed}{styleItem.availability === "sold" ? ` · ${labels.sold}` : ""}</button>;
        })}</div> : null}
        {item.tags.length ? <div className="showcase-card-tags">{item.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
      </article>
    );
  }

  return (
    <>
      {hasStage ? (
        <section className={`showcase-stage is-${displaySet.presentationPreset}`}>
          <header className="showcase-stage-header">
            <div><p>{labels.stageKicker}</p><h2>{labels.stageTitle}</h2></div>
            <span>{labels.stageCount.replace("{count}", String(stagedEntries.length))}</span>
          </header>
          <div className="showcase-stage-layout" data-count={Math.min(stagedEntries.length, 8)}>{stagedEntries.map((entry, index) => card(entry, index, true))}</div>
        </section>
      ) : null}

      {remainingEntries.length ? (
        <section className={`showcase-more ${hasStage ? "has-stage" : ""}`}>
          {hasStage ? <header><h2>{labels.moreTitle}</h2><p>{labels.moreBody}</p></header> : null}
          <div className="showcase-grid">{remainingEntries.map((entry, index) => card(entry, index, false))}</div>
        </section>
      ) : null}

      <dialog className="showcase-dialog" onClose={() => setActiveItem(null)} ref={dialogRef}>
        {activeItem ? (
          <div className="showcase-dialog-panel">
            <div className="showcase-dialog-media">
              <button aria-label={labels.close} className="showcase-dialog-close" onClick={close} type="button">×</button>
              {activeItem.images[activeImage]?.signedUrl ? <img alt={activeItem.images[activeImage].altText} src={activeItem.images[activeImage].signedUrl} /> : null}
              {activeItem.images.length > 1 ? (
                <>
                  <button aria-label={labels.previous} className="showcase-dialog-nav is-prev" onClick={() => setActiveImage((activeImage - 1 + activeItem.images.length) % activeItem.images.length)} type="button">‹</button>
                  <button aria-label={labels.next} className="showcase-dialog-nav is-next" onClick={() => setActiveImage((activeImage + 1) % activeItem.images.length)} type="button">›</button>
                </>
              ) : null}
            </div>
            <div className="showcase-dialog-info">
              <p className="showcase-card-code">{activeItem.shortCode}</p>
              <h2>{activeItem.styleGroup?.name || activeItem.title || labels.unnamed}</h2>
              {activeItem.styleGroup ? <p className="showcase-dialog-style">{activeItem.styleGroup.members.find((member) => member.itemId === activeItem.id)?.label}</p> : null}
              {activeItem.description ? <p>{activeItem.description}</p> : null}
              <p className="showcase-dialog-price">{activeItem.priceCad ? new Intl.NumberFormat(locale === "zh" ? "zh-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(activeItem.priceCad) : labels.askPrice}</p>
              <p className={`showcase-dialog-status ${activeItem.availability === "sold" ? "is-sold" : ""}`}>{activeItem.availability === "sold" ? labels.sold : labels.inquiry}</p>
              {activeItem.tags.length ? <div className="showcase-card-tags">{activeItem.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
              <button className="button-primary" onClick={() => void copyCode()} type="button">{copyState === "copied" ? labels.copied : copyState === "failed" ? labels.copyFailed : labels.copyCode}</button>
              {activeItem.images.length > 1 ? <div className="showcase-dialog-thumbs">{activeItem.images.map((image, imageIndex) => <button aria-label={`${labels.imageCount.replace("{count}", String(imageIndex + 1))}`} aria-pressed={imageIndex === activeImage} key={image.id} onClick={() => setActiveImage(imageIndex)} type="button"><img alt="" src={image.signedUrl} /></button>)}</div> : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
