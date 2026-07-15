"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import { useCart } from "@/components/cart/cart-provider";
import type { PublicProduct } from "@/lib/catalog/public-data";
import type { AppLocale } from "@/lib/i18n/config";

type ProductMessages = {
  galleryLabel: string;
  imagePreparing: string;
  openOriginal: string;
  viewImage: string;
  closeImage: string;
  previousImage: string;
  nextImage: string;
  imageCount: string;
  stockWithCount: string;
  variantSoldOut: string;
  chooseForStock: string;
  selected: string;
  unavailable: string;
  selectionNotice: string;
  selectionError: string;
  quantity: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  addToCart: string;
  addedToCart: string;
  viewCart: string;
  cartLimit: string;
  cartNoteTitle: string;
  cartNoteBody: string;
  pickupTitle: string;
  pickupBody: string;
  deliveryTitle: string;
  deliveryBody: string;
  saleBadge: string;
  newBadge: string;
  fromSuffix: string;
  stockUnit: string;
};

export function ProductExperience({ product, messages, locale }: { product: PublicProduct; messages: ProductMessages; locale: AppLocale }) {
  const cad = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" }), [locale]);
  const { addItem, items } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selectedValueIds = Object.values(selected);
  const complete = product.options.length === selectedValueIds.length;
  const selectedVariant = useMemo(() => {
    if (product.options.length === 0) return product.variants[0] ?? null;
    if (!complete) return null;
    return product.variants.find((variant) =>
      variant.optionValueIds.length === selectedValueIds.length
      && selectedValueIds.every((valueId) => variant.optionValueIds.includes(valueId)),
    ) ?? null;
  }, [complete, product.options.length, product.variants, selectedValueIds]);
  const visibleImages = useMemo(() => {
    if (!selectedVariant) return product.images;
    const matching = product.images.filter((image) => !image.variantId || image.variantId === selectedVariant.id);
    return matching.length > 0 ? matching : product.images;
  }, [product.images, selectedVariant]);
  const [activeImageId, setActiveImageId] = useState<string | null>(product.images[0]?.id ?? null);
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);

  const activeImage = visibleImages.find((image) => image.id === activeImageId) ?? visibleImages[0];
  const lightboxImage = visibleImages.find((image) => image.id === lightboxImageId) ?? activeImage;
  const lightboxIndex = lightboxImage ? visibleImages.findIndex((image) => image.id === lightboxImage.id) : -1;
  const displayPrice = selectedVariant?.priceCad ?? product.minimumPrice;
  const displayCompareAt = selectedVariant?.isOnSale ? selectedVariant.compareAtPriceCad : product.compareAtPrice;
  const displayStock = selectedVariant?.stockQty;
  const quantityAlreadyInCart = selectedVariant
    ? items.find((item) => item.variantId === selectedVariant.id)?.quantity ?? 0
    : 0;
  const remainingStock = selectedVariant ? Math.max(0, selectedVariant.stockQty - quantityAlreadyInCart) : 0;

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (lightboxImageId && !dialog.open) dialog.showModal();
    if (!lightboxImageId && dialog.open) dialog.close();
  }, [lightboxImageId]);

  function closeLightbox() {
    lightboxRef.current?.close();
    setLightboxImageId(null);
  }

  function moveLightbox(direction: -1 | 1) {
    if (visibleImages.length < 2 || lightboxIndex < 0) return;
    const nextIndex = (lightboxIndex + direction + visibleImages.length) % visibleImages.length;
    const nextImage = visibleImages[nextIndex];
    setLightboxImageId(nextImage.id);
    setActiveImageId(nextImage.id);
  }

  useEffect(() => {
    if (!lightboxImageId) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        lightboxRef.current?.close();
        setLightboxImageId(null);
        return;
      }
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || visibleImages.length < 2 || lightboxIndex < 0) return;
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const nextIndex = (lightboxIndex + direction + visibleImages.length) % visibleImages.length;
      const nextImage = visibleImages[nextIndex];
      setLightboxImageId(nextImage.id);
      setActiveImageId(nextImage.id);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImageId, lightboxIndex, visibleImages]);

  function valueIsPossible(optionId: string, valueId: string) {
    const otherSelected = Object.entries(selected)
      .filter(([currentOptionId]) => currentOptionId !== optionId)
      .map(([, selectedId]) => selectedId);
    return product.variants.some((variant) =>
      variant.optionValueIds.includes(valueId)
      && otherSelected.every((selectedId) => variant.optionValueIds.includes(selectedId)),
    );
  }

  return (
    <div className="product-detail-grid">
      <section aria-label={messages.galleryLabel} className="product-gallery">
        <div className="gallery-main">
          {activeImage?.url ? <button aria-label={`${messages.openOriginal}${locale === "en" ? ": " : "："}${activeImage.alt}`} className="gallery-image-button" onClick={() => setLightboxImageId(activeImage.id)} type="button"><img alt={activeImage.alt} src={activeImage.url} /></button> : <div className="gallery-placeholder"><Image alt="" src={logo} /><p>{messages.imagePreparing}</p></div>}
          {activeImage?.url ? <button className="gallery-open" onClick={() => setLightboxImageId(activeImage.id)} type="button">{messages.openOriginal}<span className="sr-only">{locale === "en" ? ": " : "："}{activeImage.alt}</span></button> : null}
        </div>
        {visibleImages.length > 1 ? (
          <div className="gallery-thumbnails" role="list">
            {visibleImages.map((image) => (
              <button aria-label={`${messages.viewImage}${locale === "en" ? ": " : "："}${image.alt}`} aria-pressed={image.id === activeImage?.id} className={image.id === activeImage?.id ? "is-active" : ""} key={image.id} onClick={() => setActiveImageId(image.id)} type="button">
                {image.url ? <img alt="" src={image.url} /> : <Image alt="" src={logo} />}
              </button>
            ))}
          </div>
        ) : null}
        <dialog
          aria-label={messages.galleryLabel}
          className="image-lightbox"
          onCancel={() => setLightboxImageId(null)}
          onClick={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}
          onClose={() => setLightboxImageId(null)}
          ref={lightboxRef}
        >
          <div className="image-lightbox-panel">
            <div className="image-lightbox-toolbar">
              <span aria-live="polite">{messages.imageCount.replace("{current}", String(lightboxIndex + 1)).replace("{total}", String(visibleImages.length))}</span>
              <button aria-label={messages.closeImage} onClick={closeLightbox} type="button">×</button>
            </div>
            <div className="image-lightbox-stage">
              {lightboxImage?.url ? <img alt={lightboxImage.alt} src={lightboxImage.url} /> : null}
              {visibleImages.length > 1 ? <><button aria-label={messages.previousImage} className="image-lightbox-nav is-previous" onClick={() => moveLightbox(-1)} type="button">‹</button><button aria-label={messages.nextImage} className="image-lightbox-nav is-next" onClick={() => moveLightbox(1)} type="button">›</button></> : null}
            </div>
            {visibleImages.length > 1 ? <div className="image-lightbox-thumbnails">{visibleImages.map((image) => <button aria-label={`${messages.viewImage}${locale === "en" ? ": " : "："}${image.alt}`} aria-pressed={image.id === lightboxImage?.id} key={image.id} onClick={() => { setLightboxImageId(image.id); setActiveImageId(image.id); }} type="button">{image.url ? <img alt="" src={image.url} /> : <Image alt="" src={logo} />}</button>)}</div> : null}
          </div>
        </dialog>
      </section>

      <section className="product-purchase" aria-labelledby="product-title">
        <div className="product-title-block">
          <div className="detail-badges">{product.isOnSale ? <span className="badge badge-sale">{messages.saleBadge}</span> : null}{product.newFrom ? <span className="badge badge-new">{messages.newBadge}</span> : null}</div>
          <h1 id="product-title">{product.title}</h1>
          {product.shortDescription ? <p>{product.shortDescription}</p> : null}
        </div>
        <div className="detail-price"><strong>{cad.format(displayPrice)}</strong>{displayCompareAt ? <del>{cad.format(displayCompareAt)}</del> : null}{!selectedVariant && product.minimumPrice !== product.maximumPrice ? <span>{messages.fromSuffix}</span> : null}</div>
        <p className={displayStock === 0 || (!selectedVariant && !product.hasStock) ? "detail-stock stock-out" : "detail-stock stock-in"} aria-live="polite">
          {selectedVariant ? (selectedVariant.stockQty > 0 ? `${messages.stockWithCount} · ${selectedVariant.stockQty} ${messages.stockUnit}` : messages.variantSoldOut) : product.options.length > 0 ? messages.chooseForStock : product.hasStock ? messages.stockWithCount : messages.variantSoldOut}
        </p>

        {product.options.map((option) => (
          <fieldset className="option-group" key={option.id}>
            <legend>{option.name}{selected[option.id] ? <span>{messages.selected}{locale === "en" ? ": " : "："}{option.values.find((value) => value.id === selected[option.id])?.label}</span> : null}</legend>
            <div className="option-values">
              {option.values.map((value) => {
                const possible = valueIsPossible(option.id, value.id);
                const isSelected = selected[option.id] === value.id;
                return (
                  <button aria-pressed={isSelected} className={`${isSelected ? "is-selected" : ""} ${possible ? "" : "is-unavailable"}`} disabled={!possible} key={value.id} onClick={() => { setSelected((current) => ({ ...current, [option.id]: value.id })); setQuantity(1); setAdded(false); }} type="button">
                    {value.colorSwatch ? <span aria-hidden="true" className="color-swatch" style={{ backgroundColor: value.colorSwatch }} /> : null}
                    {value.label}
                    {!possible ? <span className="sr-only">，{messages.unavailable}</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {product.options.length > 0 && !complete ? <p className="selection-notice" role="status">{messages.selectionNotice}</p> : null}
        {complete && !selectedVariant ? <p className="selection-error" role="alert">{messages.selectionError}</p> : null}
        <div className="product-cart-actions">
          <div className="product-quantity">
            <span>{messages.quantity}</span>
            <div className="quantity-control">
              <button aria-label={messages.decreaseQuantity} disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} type="button">−</button>
              <output aria-live="polite">{quantity}</output>
              <button aria-label={messages.increaseQuantity} disabled={!selectedVariant || quantity >= remainingStock} onClick={() => setQuantity((current) => current + 1)} type="button">＋</button>
            </div>
          </div>
          <button
            className="button-primary product-add-button"
            disabled={!selectedVariant || selectedVariant.stockQty === 0 || remainingStock === 0 || quantity > remainingStock}
            onClick={() => {
              if (!selectedVariant || quantity > remainingStock) return;
              addItem(selectedVariant.id, quantity);
              setAdded(true);
              setQuantity(1);
            }}
            type="button"
          >{remainingStock === 0 && selectedVariant?.stockQty ? messages.cartLimit : messages.addToCart}</button>
        </div>
        {added ? <p className="cart-added" role="status">{messages.addedToCart} <a href={`/${locale}/cart`}>{messages.viewCart}</a></p> : null}
        <div className="phase-note"><strong>{messages.cartNoteTitle}</strong><p>{messages.cartNoteBody}</p></div>
        <div className="fulfillment-mini"><div><strong>{messages.pickupTitle}</strong><span>{messages.pickupBody}</span></div><div><strong>{messages.deliveryTitle}</strong><span>{messages.deliveryBody}</span></div></div>
      </section>
    </div>
  );
}
