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
import type { ValidatedCartItem } from "@/lib/cart/server-validation";
import { useCart } from "@/components/cart/cart-provider";
import { OrderRequestSubmitButton } from "./submit-button";

const initialState: SubmitOrderState = { status: "idle", message: "", fieldErrors: {} };

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null;
}

export function OrderRequestForm({ locale }: { locale: AppLocale }) {
  const { items, hydrated, clearCart } = useCart();
  const router = useRouter();
  const action = useMemo(() => submitOrderRequestAction.bind(null, locale), [locale]);
  const [state, formAction] = useActionState(action, initialState);
  const [preferredContact, setPreferredContact] = useState("email");
  const [fulfillmentMethod, setFulfillmentMethod] = useState("pickup");
  const [summary, setSummary] = useState<{ key: string; status: "ready" | "error"; items: ValidatedCartItem[] }>({ key: "", status: "ready", items: [] });
  const cartItems = JSON.stringify(items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })));
  const validationKey = items.map((item) => `${item.variantId}:${item.quantity}`).join("|");
  const cad = useMemo(() => new Intl.NumberFormat("zh-CA", { style: "currency", currency: "CAD" }), []);

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

  if (!hydrated) return <div className="order-loading" role="status">正在读取本设备的购物车…</div>;
  if (items.length === 0) {
    return (
      <section className="empty-state order-empty">
        <h2>购物车中没有可提交的商品</h2>
        <p>请先选择完整规格并加入购物车，再填写订单请求。</p>
        <Link className="button-primary" href={`/${locale}/products`}>返回全部商品</Link>
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
        <label htmlFor="companyWebsite">公司网站</label>
        <input autoComplete="off" id="companyWebsite" name="companyWebsite" tabIndex={-1} type="text" />
      </div>

      {state.status === "error" ? <div className="order-form-alert" role="alert">{state.message}</div> : null}
      <ErrorText id="cart-error" message={state.fieldErrors.cart} />

      <fieldset className="order-section">
        <legend>联系信息</legend>
        <div className="order-fields two-columns">
          <label><span className="field-label">姓名 <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.customerName ? "customer-name-error" : undefined} aria-invalid={Boolean(state.fieldErrors.customerName)} autoComplete="name" maxLength={120} name="customerName" required />
            <ErrorText id="customer-name-error" message={state.fieldErrors.customerName} />
          </label>
          <label><span className="field-label">邮箱 <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.email ? "email-error" : undefined} aria-invalid={Boolean(state.fieldErrors.email)} autoComplete="email" maxLength={320} name="email" required type="email" />
            <ErrorText id="email-error" message={state.fieldErrors.email} />
          </label>
          <label><span className="field-label">联系电话{preferredContact === "phone" ? <span aria-hidden="true"> *</span> : null}</span>
            <input aria-describedby={state.fieldErrors.phone ? "phone-error" : undefined} aria-invalid={Boolean(state.fieldErrors.phone)} autoComplete="tel" maxLength={40} name="phone" required={preferredContact === "phone"} type="tel" />
            <ErrorText id="phone-error" message={state.fieldErrors.phone} />
          </label>
          <label>微信号或其他补充联系方式
            <input aria-describedby={state.fieldErrors.wechatOrOtherContact ? "other-contact-error" : undefined} aria-invalid={Boolean(state.fieldErrors.wechatOrOtherContact)} maxLength={120} name="wechatOrOtherContact" />
            <ErrorText id="other-contact-error" message={state.fieldErrors.wechatOrOtherContact} />
          </label>
        </div>
      </fieldset>

      <section className="order-section order-summary" aria-labelledby="order-summary-title">
        <h2 id="order-summary-title">订单摘要</h2>
        <p>这里的商品、价格和库存已由服务器重新校验；提交事务仍会再独立复核一次。</p>
        {summaryStatus === "loading" ? <div className="summary-status" role="status">正在重新校验商品、价格和库存…</div> : null}
        {summaryStatus === "error" ? <div className="summary-error" role="alert">暂时无法校验订单摘要，请返回购物车后重试。</div> : null}
        {summaryStatus === "ready" ? (
          <div className="summary-items">
            {summaryItems.map((item) => item.status === "valid" && item.product ? (
              <article className={item.product.stockQty < item.quantity ? "is-invalid" : ""} key={item.variantId}>
                <div><strong>{item.product.title}</strong><span>{item.product.variantLabel} · SKU {item.product.sku}</span></div>
                <div><span>{item.quantity} × {cad.format(item.product.unitPriceCad)}</span><strong>{cad.format(item.quantity * item.product.unitPriceCad)}</strong></div>
                {item.product.stockQty < item.quantity ? <p role="alert">当前库存不足，请返回购物车调整数量。</p> : null}
              </article>
            ) : <article className="is-invalid" key={item.variantId}><p role="alert">商品或规格已不可用，请返回购物车移除。</p></article>)}
            <div className="summary-subtotal"><span>商品小计</span><strong>{cad.format(subtotal)}</strong></div>
          </div>
        ) : null}
      </section>

      <fieldset className="order-section choice-section">
        <legend>偏好联系方式 <span aria-hidden="true">*</span></legend>
        <div className="choice-grid">
          <label><input checked={preferredContact === "email"} name="preferredContact" onChange={() => setPreferredContact("email")} type="radio" value="email" /> <span><strong>邮箱</strong><small>通过你填写的邮箱联系</small></span></label>
          <label><input checked={preferredContact === "phone"} name="preferredContact" onChange={() => setPreferredContact("phone")} type="radio" value="phone" /> <span><strong>电话</strong><small>联系电话将变为必填</small></span></label>
        </div>
        <ErrorText id="preferred-contact-error" message={state.fieldErrors.preferredContact} />
      </fieldset>

      <fieldset className="order-section choice-section">
        <legend>履约方式 <span aria-hidden="true">*</span></legend>
        <div className="choice-grid">
          <label><input checked={fulfillmentMethod === "pickup"} name="fulfillmentMethod" onChange={() => setFulfillmentMethod("pickup")} type="radio" value="pickup" /> <span><strong>自取</strong><small>地点和时间由店主联系确认</small></span></label>
          <label><input checked={fulfillmentMethod === "local_delivery"} name="fulfillmentMethod" onChange={() => setFulfillmentMethod("local_delivery")} type="radio" value="local_delivery" /> <span><strong>本地配送</strong><small>范围和费用由店主确认</small></span></label>
        </div>
        <ErrorText id="fulfillment-error" message={state.fieldErrors.fulfillmentMethod} />
        <div className="order-fields two-columns conditional-fields">
          <label><span className="field-label">城市或区域 <span aria-hidden="true">*</span></span>
            <input aria-describedby={state.fieldErrors.cityOrArea ? "city-error" : undefined} aria-invalid={Boolean(state.fieldErrors.cityOrArea)} autoComplete="address-level2" maxLength={120} name="cityOrArea" required />
            <ErrorText id="city-error" message={state.fieldErrors.cityOrArea} />
          </label>
          <label><span className="field-label">邮编{fulfillmentMethod === "local_delivery" ? <span aria-hidden="true"> *</span> : null}</span>
            <input aria-describedby={state.fieldErrors.postalCode ? "postal-error" : undefined} aria-invalid={Boolean(state.fieldErrors.postalCode)} autoComplete="postal-code" maxLength={20} name="postalCode" required={fulfillmentMethod === "local_delivery"} />
            <ErrorText id="postal-error" message={state.fieldErrors.postalCode} />
          </label>
        </div>
      </fieldset>

      <fieldset className="order-section">
        <legend>时间与备注</legend>
        <div className="order-fields">
          <label>期望取货或配送时间
            <input aria-describedby={state.fieldErrors.preferredTime ? "time-error" : undefined} aria-invalid={Boolean(state.fieldErrors.preferredTime)} maxLength={200} name="preferredTime" placeholder="例如：周六下午（最终时间待确认）" />
            <ErrorText id="time-error" message={state.fieldErrors.preferredTime} />
          </label>
          <label>订单备注
            <textarea aria-describedby={state.fieldErrors.customerNote ? "note-error" : undefined} aria-invalid={Boolean(state.fieldErrors.customerNote)} maxLength={2000} name="customerNote" rows={5} />
            <ErrorText id="note-error" message={state.fieldErrors.customerNote} />
          </label>
        </div>
      </fieldset>

      <section className="order-confirmation" aria-labelledby="order-confirmation-title">
        <h2 id="order-confirmation-title">提交前请确认</h2>
        <p><strong>提交后不会立即付款，也不代表订单已经最终确认。</strong> Happy Beans 会联系你核对库存、自取或配送安排、税费及最终金额。</p>
        <label className="consent-label">
          <input aria-describedby={state.fieldErrors.consent ? "consent-error" : undefined} aria-invalid={Boolean(state.fieldErrors.consent)} name="consent" required type="checkbox" />
          <span>我了解这是订单请求，并同意仅为联系和履约安排提供以上必要信息。</span>
        </label>
        <ErrorText id="consent-error" message={state.fieldErrors.consent} />
      </section>

      <div className="order-submit-row">
        <Link className="button-secondary" href={`/${locale}/cart`}>返回购物车</Link>
        <div><p>未付款 · 未最终确认</p><OrderRequestSubmitButton blocked={summaryBlocked} /></div>
      </div>
    </form>
  );
}
