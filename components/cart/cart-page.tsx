"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import { revalidateCart } from "@/app/[locale]/cart/actions";
import type { ValidatedCartItem } from "@/lib/cart/server-validation";
import type { AppLocale } from "@/lib/i18n/config";
import { useCart } from "./cart-provider";

type CartMessages = {
  title: string;
  intro: string;
  continueShopping: string;
  loading: string;
  validationError: string;
  retry: string;
  recovered: string;
  emptyTitle: string;
  emptyBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  remove: string;
  clear: string;
  clearConfirm: string;
  clearConfirmButton: string;
  cancel: string;
  quantity: string;
  decrease: string;
  increase: string;
  unitPrice: string;
  lineTotal: string;
  subtotal: string;
  priceChanged: string;
  stockChanged: string;
  soldOut: string;
  blockingIssue: string;
  validationNote: string;
  feesTitle: string;
  feesBody: string;
  orderRequestLater: string;
  orderRequestCta: string;
};

export function CartPage({ locale, messages }: { locale: AppLocale; messages: CartMessages }) {
  const cad = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" }), [locale]);
  const {
    items,
    hydrated,
    recoveredFromInvalidStorage,
    updateQuantity,
    removeItem,
    clearCart,
    saveValidatedPrice,
  } = useCart();
  const [validationResult, setValidationResult] = useState<{
    key: string;
    status: "ready" | "error";
    items: ValidatedCartItem[];
  }>({ key: "", status: "ready", items: [] });
  const [refreshToken, setRefreshToken] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const lastValidationKey = useRef("");
  const validationKey = useMemo(
    () => `${refreshToken}:${items.map((item) => `${item.variantId}:${item.quantity}`).join("|")}`,
    [items, refreshToken],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      lastValidationKey.current = validationKey;
      return;
    }
    if (lastValidationKey.current === validationKey) return;
    let cancelled = false;
    revalidateCart(locale, items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      previousPriceCad: item.lastValidatedPriceCad,
    }))).then((result) => {
      if (cancelled) return;
      lastValidationKey.current = validationKey;
      setValidationResult({ key: validationKey, status: "ready", items: result });
      for (const item of result) {
        if (item.status === "valid" && item.product) saveValidatedPrice(item.variantId, item.product.unitPriceCad);
      }
    }).catch(() => {
      if (!cancelled) {
        lastValidationKey.current = validationKey;
        setValidationResult({ key: validationKey, status: "error", items: [] });
      }
    });
    return () => { cancelled = true; };
  }, [hydrated, items, locale, saveValidatedPrice, validationKey]);

  const retry = useCallback(() => setRefreshToken((current) => current + 1), []);
  const validationState = items.length === 0
    ? "ready"
    : validationResult.key === validationKey
      ? validationResult.status
      : "loading";
  const validated = validationResult.key === validationKey ? validationResult.items : [];
  const subtotal = validated.reduce((total, item) => item.status === "valid" && item.product
    ? total + item.product.unitPriceCad * item.quantity
    : total, 0);
  const hasBlockingIssue = validated.some((item) => item.status === "unavailable" || (item.product?.stockQty ?? 0) < item.quantity);

  if (!hydrated) {
    return <main className="cart-page"><div className="store-container cart-loading" role="status">{messages.loading}</div></main>;
  }

  return (
    <main className="cart-page">
      <div className="store-container">
        <div className="cart-heading">
          <div><p className="cart-kicker">Happy Beans{locale === "zh" ? " / 福豆" : ""}</p><h1>{messages.title}</h1><p>{messages.intro}</p></div>
          <Link className="button-secondary" href={`/${locale}/products`}>{messages.continueShopping}</Link>
        </div>

        {recoveredFromInvalidStorage ? <p className="cart-recovery" role="status">{messages.recovered}</p> : null}
        {items.length === 0 ? (
          <section className="empty-state cart-empty">
            <Image alt="" className="cart-empty-logo" src={logo} />
            <h2>{messages.emptyTitle}</h2><p>{messages.emptyBody}</p>
            <Link className="button-primary" href={`/${locale}/products`}>{messages.continueShopping}</Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section aria-label={messages.title} className="cart-items">
              <div className="cart-items-toolbar">
                <p>{messages.validationNote}</p>
                {confirmingClear ? (
                  <div className="cart-clear-confirm" role="group" aria-label={messages.clearConfirm}>
                    <span>{messages.clearConfirm}</span>
                    <button className="cart-clear" onClick={() => { clearCart(); setConfirmingClear(false); }} type="button">{messages.clearConfirmButton}</button>
                    <button className="cart-clear-cancel" onClick={() => setConfirmingClear(false)} type="button">{messages.cancel}</button>
                  </div>
                ) : <button className="cart-clear" onClick={() => setConfirmingClear(true)} type="button">{messages.clear}</button>}
              </div>
              {validationState === "loading" ? <div className="cart-validating" role="status">{messages.loading}</div> : null}
              {validationState === "error" ? <div className="cart-validation-error" role="alert"><p>{messages.validationError}</p><button className="button-secondary" onClick={retry} type="button">{messages.retry}</button></div> : null}
              {validationState === "ready" ? validated.map((item) => {
                if (item.status === "unavailable" || !item.product) {
                  return (
                    <article className="cart-item cart-item-invalid" key={item.variantId}>
                      <div className="cart-item-placeholder"><Image alt="" src={logo} /></div>
                      <div className="cart-item-main"><h2>{messages.unavailableTitle}</h2><p className="cart-warning" role="alert">{messages.unavailableBody}</p><button className="cart-remove" onClick={() => removeItem(item.variantId)} type="button">{messages.remove}</button></div>
                    </article>
                  );
                }
                const product = item.product;
                const insufficient = item.quantity > product.stockQty;
                return (
                  <article className={`cart-item ${insufficient ? "cart-item-invalid" : ""}`} key={item.variantId}>
                    <Link className="cart-item-image" href={`/${locale}/products/${product.slug}`}>
                      {product.imageUrl ? <img alt={product.imageAlt} src={product.imageUrl} /> : <Image alt="" src={logo} />}
                    </Link>
                    <div className="cart-item-main">
                      <div className="cart-item-title-row"><div><h2><Link href={`/${locale}/products/${product.slug}`}>{product.title}</Link></h2><p>{product.variantLabel}</p><span>SKU: {product.sku}</span></div><button aria-label={`${messages.remove}${locale === "en" ? ": " : "："}${product.title}`} className="cart-remove" onClick={() => removeItem(item.variantId)} type="button">{messages.remove}</button></div>
                      {item.priceChanged ? <p className="cart-warning" role="status">{messages.priceChanged}</p> : null}
                      {product.stockQty === 0 ? <p className="cart-warning" role="alert">{messages.soldOut}</p> : insufficient ? <p className="cart-warning" role="alert">{messages.stockChanged.replace("{stock}", String(product.stockQty))}</p> : null}
                      <div className="cart-item-controls">
                        <div><span>{messages.quantity}</span><div className="quantity-control"><button aria-label={`${messages.decrease}${locale === "en" ? ": " : "："}${product.title}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.variantId, item.quantity - 1)} type="button">−</button><output aria-live="polite">{item.quantity}</output><button aria-label={`${messages.increase}${locale === "en" ? ": " : "："}${product.title}`} disabled={item.quantity >= product.stockQty || item.quantity >= 99} onClick={() => updateQuantity(item.variantId, item.quantity + 1)} type="button">＋</button></div></div>
                        <dl><div><dt>{messages.unitPrice}</dt><dd>{cad.format(product.unitPriceCad)}{product.compareAtPriceCad ? <del>{cad.format(product.compareAtPriceCad)}</del> : null}</dd></div><div><dt>{messages.lineTotal}</dt><dd>{cad.format(product.unitPriceCad * item.quantity)}</dd></div></dl>
                      </div>
                    </div>
                  </article>
                );
              }) : null}
            </section>

            <aside className="cart-summary">
              <div className="cart-subtotal"><span>{messages.subtotal}</span><strong>{validationState === "ready" ? cad.format(subtotal) : "—"}</strong></div>
              <div className="cart-fees"><strong>{messages.feesTitle}</strong><p>{messages.feesBody}</p></div>
              {hasBlockingIssue ? <p className="cart-summary-warning" role="alert">{messages.blockingIssue}</p> : null}
              <p className="cart-order-later">{messages.orderRequestLater}</p>
              <Link
                aria-disabled={hasBlockingIssue || validationState !== "ready"}
                className={`button-primary cart-order-button ${hasBlockingIssue || validationState !== "ready" ? "is-disabled" : ""}`}
                href={hasBlockingIssue || validationState !== "ready" ? `/${locale}/cart` : `/${locale}/order-request`}
              >
                {messages.orderRequestCta}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
