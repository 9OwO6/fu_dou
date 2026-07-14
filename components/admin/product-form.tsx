"use client";

import { useActionState } from "react";

import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/admin/(protected)/products/actions";
import type { AdminProductDetail } from "@/lib/catalog/admin-data";

import { SubmitButton } from "./submit-button";

const initialState: ProductActionState = { status: "idle", message: "", fieldErrors: {} };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="mt-1 text-sm text-rose-700" id={id}>{message}</p> : null;
}

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100";

export function ProductForm({ product }: { product?: AdminProductDetail }) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="product-basic-heading">
        <h2 className="text-lg font-semibold" id="product-basic-heading">基础内容</h2>
        <div className="mt-5 grid gap-5">
          <label className="block font-medium" htmlFor="title">
            中文标题 <span className="text-rose-600" aria-hidden="true">*</span>
            <input aria-describedby={state.fieldErrors.title ? "title-error" : undefined} aria-invalid={Boolean(state.fieldErrors.title)} className={inputClass} defaultValue={product?.title} id="title" maxLength={200} name="title" required />
            <FieldError id="title-error" message={state.fieldErrors.title} />
          </label>
          <label className="block font-medium" htmlFor="slug">
            网址标识 <span className="text-rose-600" aria-hidden="true">*</span>
            <input aria-describedby={state.fieldErrors.slug ? "slug-error" : "slug-help"} aria-invalid={Boolean(state.fieldErrors.slug)} autoCapitalize="none" className={inputClass} defaultValue={product?.slug} id="slug" maxLength={160} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            <span className="mt-1 block text-sm font-normal text-slate-500" id="slug-help">仅使用小写字母、数字和连字符，例如 cat-mug。</span>
            <FieldError id="slug-error" message={state.fieldErrors.slug} />
          </label>
          <label className="block font-medium" htmlFor="shortDescription">
            简短描述
            <textarea aria-describedby={state.fieldErrors.shortDescription ? "short-description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.shortDescription)} className={inputClass} defaultValue={product?.shortDescription} id="shortDescription" maxLength={300} name="shortDescription" rows={3} />
            <FieldError id="short-description-error" message={state.fieldErrors.shortDescription} />
          </label>
          <label className="block font-medium" htmlFor="description">
            商品描述
            <textarea aria-describedby={state.fieldErrors.description ? "description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.description)} className={inputClass} defaultValue={product?.description} id="description" maxLength={10000} name="description" rows={9} />
            <FieldError id="description-error" message={state.fieldErrors.description} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="product-seo-heading">
        <h2 className="text-lg font-semibold" id="product-seo-heading">SEO</h2>
        <p className="mt-1 text-sm text-slate-500">留空时，公开页面将在 Phase 6 使用商品标题与描述生成默认值。</p>
        <div className="mt-5 grid gap-5">
          <label className="block font-medium" htmlFor="seoTitle">
            SEO 标题
            <input aria-describedby={state.fieldErrors.seoTitle ? "seo-title-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoTitle)} className={inputClass} defaultValue={product?.seoTitle} id="seoTitle" maxLength={70} name="seoTitle" />
            <FieldError id="seo-title-error" message={state.fieldErrors.seoTitle} />
          </label>
          <label className="block font-medium" htmlFor="seoDescription">
            SEO 描述
            <textarea aria-describedby={state.fieldErrors.seoDescription ? "seo-description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoDescription)} className={inputClass} defaultValue={product?.seoDescription} id="seoDescription" maxLength={160} name="seoDescription" rows={3} />
            <FieldError id="seo-description-error" message={state.fieldErrors.seoDescription} />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role={state.status === "error" ? "alert" : undefined}>
          {state.message}
        </p>
        <SubmitButton pendingLabel="保存中…">{product ? "保存商品" : "创建草稿"}</SubmitButton>
      </div>
    </form>
  );
}
