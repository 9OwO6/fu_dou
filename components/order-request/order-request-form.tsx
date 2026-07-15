"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { revalidateCart } from "@/app/[locale]/cart/actions";
import {
  submitOrderRequestAction,
  type SubmitOrderState,
} from "@/app/[locale]/order-request/actions";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import type { ValidatedCartItem } from "@/lib/cart/server-validation";
import { useCart } from "@/components/cart/cart-provider";
import { OrderRequestSubmitButton } from "./submit-button";

const initialState: SubmitOrderState = { status: "idle", message: "", fieldErrors: {} };

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null;
}

export function OrderRequestForm({ locale }: { locale: AppLocale }) {
  const messages = getMessages(locale).public.orderRequest;
  const { items, hydrated, clearCart } = useCart();
  const router = useRouter();
  const action = useMemo(() => submitOrderRequestAction.bind(null, locale), [locale]);
  const [state, formAction] = useActionState(action, initialState);
  const [preferredContact, setPreferredContact] = useState("email");
  const [fulfillmentMethod, setFulfillmentMethod] = useState("pickup");
  const [summary, setSummary] = useState<{ key: string; status: "ready" | "error"; items: ValidatedCartItem[] }>({ key: "", status: "ready", items: [] });
  const cartItems = JSON.stringify(items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })));
  const validationKey = items.map((item) => `${item.variantId}:${item.quantity}`).join("|");
  const cad = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" }), [locale]);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    revalidateCart(locale, items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })))
      .then((validated) => { if (!cancelled) setSummary({ key: validationKey, status: "ready", items: validated }); })
      .catch(() => { if (!cancelled) setSummary({ key: validationKey, status: "error", items: [] }); });
    return () => { cancelled = true; };
  }, [hydrated, items, locale, validationKey]);

  useEffect(() => {
    if (state.status !== "success" || !state.requestNumber) return;
    clearCart();
    router.replace(`/${locale}/order-request/success?request=${encodeURIComponent(state.requestNumber)}`);
  }, [clearCart, locale, router, state.requestNumber, state.status]);

  if (!hydrated) return <div className="order-loading" role="status">{messages.loadingCart}</div>;
  if (items.length === 0) {
    return (
      <section className="empty-state order-empty">
        <h2>{messages.emptyTitle}</h2>
        <p>{messages.emptyBody}</p>
        <Link className="button-primary" href={`/${locale}/products`}>{messages.backToProducts}</Link>
      </section>
    );
  }

  const summaryStatus = summary.key === validationKey ? summary.status : "loading";
  const summaryItems = summary.key === validationKey ? summary.items : [];
  const summaryBlocked = summaryStatus !== "ready"
    || summaryItems.length !== items.length
    || summaryItems.some((item) => item.status !== "valid" || !item.product || item.product.stockQty < item.quantity);
  const subtotal = summaryItems.reduce((total, item) => item.status === "valid" && item.product
    ? total + item.product.unitPriceCad * item.quantity
    : total, 0);

  return (
    <form action={formAction} className="order-form" noValidate>
      <input name="cartItems" type="hidden" value={cartItems} />
      <div aria-hidden="true" className="order-honeypot">
        <label htmlFor="companyWebsite">{messages.honeypot}</label>
        <input autoComplete="off" id="companyWebsite" name="companyWebsite" tabIndex={-1} type="text" />
      </div>

      {state.status === "error" ? <div className="order-form-alert" role="alert">{state.message}</div> : null}
      <ErrorText id="cart-error" message={state.fieldErrors.cart} />

      <fieldset className="order-section">
        <legend>{messages.contactTitle}</legend>
        <div className="order-fields two-columns">
          <label><span className="field-label">{messages.name} <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.customerName ? "customer-name-error" : undefined} aria-invalid={Boolean(state.fieldErrors.customerName)} autoComplete="name" maxLength={120} name="customerName" required />
            <ErrorText id="customer-name-error" message={state.fieldErrors.customerName} />
          </label>
          <label><span className="field-label">{messages.email} <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.email ? "email-error" : undefined} aria-invalid={Boolean(state.fieldErrors.email)} autoComplete="email" maxLength={320} name="email" required type="email" />
            <ErrorText id="email-error" message={state.fieldErrors.email} />
          </label>
          <label><span className="field-label">{messages.phone}{preferredContact === "phone" ? <span aria-hidden="true"> *</span> : null}</span>
            <input aria-describedby={state.fieldErrors.phone ? "phone-error" : undefined} aria-invalid={Boolean(state.fieldErrors.phone)} autoComplete="tel" maxLength={40} name="phone" required={preferredContact === "phone"} type="tel" />
            <ErrorText id="phone-error" message={state.fieldErrors.phone} />
          </label>
          <label>{messages.otherContact}
            <input aria-describedby={state.fieldErrors.wechatOrOtherContact ? "other-contact-error" : undefined} aria-invalid={Boolean(state.fieldErrors.wechatOrOtherContact)} maxLength={120} name="wechatOrOtherContact" />
            <ErrorText id="other-contact-error" message={state.fieldErrors.wechatOrOtherContact} />
          </label>
        </div>
      </fieldset>

      <section className="order-section order-summary" aria-labelledby="order-summary-title">
        <h2 id="order-summary-title">{messages.summaryTitle}</h2>
        <p>{messages.summaryIntro}</p>
        {summaryStatus === "loading" ? <div className="summary-status" role="status">{messages.summaryLoading}</div> : null}
        {summaryStatus === "error" ? <div className="summary-error" role="alert">{messages.summaryError}</div> : null}
        {summaryStatus === "ready" ? (
          <div className="summary-items">
            {summaryItems.map((item) => item.status === "valid" && item.product ? (
              <article className={item.product.stockQty < item.quantity ? "is-invalid" : ""} key={item.variantId}>
                <div><strong>{item.product.title}</strong><span>{item.product.variantLabel} · SKU {item.product.sku}</span></div>
                <div><span>{item.quantity} × {cad.format(item.product.unitPriceCad)}</span><strong>{cad.format(item.quantity * item.product.unitPriceCad)}</strong></div>
                {item.product.stockQty < item.quantity ? <p role="alert">{messages.stockError}</p> : null}
              </article>
            ) : <article className="is-invalid" key={item.variantId}><p role="alert">{messages.unavailableError}</p></article>)}
            <div className="summary-subtotal"><span>{messages.subtotal}</span><strong>{cad.format(subtotal)}</strong></div>
          </div>
        ) : null}
      </section>

      <fieldset className="order-section choice-section">
        <legend>{messages.contactPreference} <span aria-hidden="true">*</span></legend>
        <div className="choice-grid">
          <label><input checked={preferredContact === "email"} name="preferredContact" onChange={() => setPreferredContact("email")} type="radio" value="email" /> <span><strong>{messages.emailOption}</strong><small>{messages.emailOptionNote}</small></span></label>
          <label><input checked={preferredContact === "phone"} name="preferredContact" onChange={() => setPreferredContact("phone")} type="radio" value="phone" /> <span><strong>{messages.phoneOption}</strong><small>{messages.phoneOptionNote}</small></span></label>
        </div>
        <ErrorText id="preferred-contact-error" message={state.fieldErrors.preferredContact} />
      </fieldset>

      <fieldset className="order-section choice-section">
        <legend>{messages.fulfillmentTitle} <span aria-hidden="true">*</span></legend>
        <div className="choice-grid">
          <label><input checked={fulfillmentMethod === "pickup"} name="fulfillmentMethod" onChange={() => setFulfillmentMethod("pickup")} type="radio" value="pickup" /> <span><strong>{messages.pickup}</strong><small>{messages.pickupNote}</small></span></label>
          <label><input checked={fulfillmentMethod === "local_delivery"} name="fulfillmentMethod" onChange={() => setFulfillmentMethod("local_delivery")} type="radio" value="local_delivery" /> <span><strong>{messages.delivery}</strong><small>{messages.deliveryNote}</small></span></label>
        </div>
        <ErrorText id="fulfillment-error" message={state.fieldErrors.fulfillmentMethod} />
        <div className="order-fields two-columns conditional-fields">
          <label><span className="field-label">{messages.city} <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.cityOrArea ? "city-error" : undefined} aria-invalid={Boolean(state.fieldErrors.cityOrArea)} autoComplete="address-level2" maxLength={120} name="cityOrArea" required />
            <ErrorText id="city-error" message={state.fieldErrors.cityOrArea} />
          </label>
          <label><span className="field-label">{messages.postalCode}{fulfillmentMethod === "local_delivery" ? <span aria-hidden="true"> *</span> : null}</span>
            <input aria-describedby={state.fieldErrors.postalCode ? "postal-error" : undefined} aria-invalid={Boolean(state.fieldErrors.postalCode)} autoComplete="postal-code" maxLength={20} name="postalCode" required={fulfillmentMethod === "local_delivery"} />
            <ErrorText id="postal-error" message={state.fieldErrors.postalCode} />
          </label>
        </div>
      </fieldset>

      <fieldset className="order-section">
        <legend>{messages.detailsTitle}</legend>
        <div className="order-fields">
          <label>{messages.preferredTime}
            <input aria-describedby={state.fieldErrors.preferredTime ? "time-error" : undefined} aria-invalid={Boolean(state.fieldErrors.preferredTime)} maxLength={200} name="preferredTime" placeholder={messages.preferredTimePlaceholder} />
            <ErrorText id="time-error" message={state.fieldErrors.preferredTime} />
          </label>
          <label>{messages.note}
            <textarea aria-describedby={state.fieldErrors.customerNote ? "note-error" : undefined} aria-invalid={Boolean(state.fieldErrors.customerNote)} maxLength={2000} name="customerNote" rows={5} />
            <ErrorText id="note-error" message={state.fieldErrors.customerNote} />
          </label>
        </div>
      </fieldset>

      <section className="order-confirmation" aria-labelledby="order-confirmation-title">
        <h2 id="order-confirmation-title">{messages.confirmTitle}</h2>
        <p><strong>{messages.confirmNotice}</strong></p>
        <label className="consent-label">
          <input aria-describedby={state.fieldErrors.consent ? "consent-error" : undefined} aria-invalid={Boolean(state.fieldErrors.consent)} name="consent" required type="checkbox" />
          <span>{messages.consent}</span>
        </label>
        <ErrorText id="consent-error" message={state.fieldErrors.consent} />
      </section>

      <div className="order-submit-row">
        <Link className="button-secondary" href={`/${locale}/cart`}>{messages.backToCart}</Link>
        <div><p>{messages.unpaidShort}</p><OrderRequestSubmitButton blocked={summaryBlocked} label={messages.submit} pendingLabel={messages.submitting} /></div>
      </div>
    </form>
  );
}
