/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicShowcaseItem } from "@/lib/showcase/data";

type CopyState = "idle" | "copied" | "failed";

export function ShowcaseGallery({
  items,
  locale,
  labels,
}: {
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
  };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeItem, setActiveItem] = useState<PublicShowcaseItem | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [copyState, setCopyState] = useState<CopyState>("idle");

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

  return (
    <>
      <div className="showcase-grid">
        {items.map((item, index) => {
          const cover = item.images[0];
          return (
            <article className="showcase-card" key={item.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
              <button aria-label={`${item.title || labels.unnamed} · ${item.shortCode}`} className="showcase-card-open" onClick={() => open(item)} type="button">
                <span className="showcase-card-media">
                  {cover?.signedUrl ? <img alt={cover.altText} loading={index < 6 ? "eager" : "lazy"} src={cover.signedUrl} /> : <span className="showcase-image-fallback" />}
                  {item.images.length > 1 ? <span className="showcase-image-count">{labels.imageCount.replace("{count}", String(item.images.length))}</span> : null}
                  {item.availability === "sold" ? <span className="showcase-sold-stamp">{labels.sold}</span> : null}
                </span>
                <span className="showcase-card-copy">
                  <span className="showcase-card-code">{item.shortCode}</span>
                  <strong>{item.title || labels.unnamed}</strong>
                  <span className="showcase-card-price">{item.priceCad ? new Intl.NumberFormat(locale === "zh" ? "zh-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(item.priceCad) : labels.askPrice}</span>
                  <span className="showcase-card-status">{item.availability === "sold" ? labels.sold : labels.inquiry}</span>
                </span>
              </button>
              {item.tags.length ? <div className="showcase-card-tags">{item.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div> : null}
            </article>
          );
        })}
      </div>

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
              <h2>{activeItem.title || labels.unnamed}</h2>
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
