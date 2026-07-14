"use client";

import { useActionState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/admin/(protected)/categories/actions";
import type { AdminCategory } from "@/lib/catalog/admin-data";

import { SubmitButton } from "./submit-button";

const initialState: CategoryActionState = { status: "idle", message: "", fieldErrors: {} };
const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

function ErrorText({ id, children }: { id: string; children?: string }) {
  return children ? <p className="mt-1 text-sm text-rose-700" id={id}>{children}</p> : null;
}

function CategoryFields({ category, state, prefix }: { category?: AdminCategory; state: CategoryActionState; prefix: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="font-medium" htmlFor={`${prefix}-name`}>
        中文名称
        <input aria-describedby={state.fieldErrors.name ? `${prefix}-name-error` : undefined} aria-invalid={Boolean(state.fieldErrors.name)} className={inputClass} defaultValue={category?.name} id={`${prefix}-name`} maxLength={160} name="name" required />
        <ErrorText id={`${prefix}-name-error`}>{state.fieldErrors.name}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-slug`}>
        网址标识
        <input aria-describedby={state.fieldErrors.slug ? `${prefix}-slug-error` : undefined} aria-invalid={Boolean(state.fieldErrors.slug)} autoCapitalize="none" className={inputClass} defaultValue={category?.slug} id={`${prefix}-slug`} maxLength={160} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        <ErrorText id={`${prefix}-slug-error`}>{state.fieldErrors.slug}</ErrorText>
      </label>
      <label className="font-medium md:col-span-2" htmlFor={`${prefix}-description`}>
        分类描述
        <textarea aria-describedby={state.fieldErrors.description ? `${prefix}-description-error` : undefined} aria-invalid={Boolean(state.fieldErrors.description)} className={inputClass} defaultValue={category?.description} id={`${prefix}-description`} maxLength={2000} name="description" rows={3} />
        <ErrorText id={`${prefix}-description-error`}>{state.fieldErrors.description}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-sort-order`}>
        排序值
        <input aria-describedby={state.fieldErrors.sortOrder ? `${prefix}-sort-error` : undefined} aria-invalid={Boolean(state.fieldErrors.sortOrder)} className={inputClass} defaultValue={category?.sortOrder ?? 0} id={`${prefix}-sort-order`} max={99999} min={0} name="sortOrder" required step={1} type="number" />
        <span className="mt-1 block text-sm font-normal text-slate-500">数值越小越靠前。</span>
        <ErrorText id={`${prefix}-sort-error`}>{state.fieldErrors.sortOrder}</ErrorText>
      </label>
      <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3 font-medium">
        <input className="size-4 accent-sky-700" defaultChecked={category?.isVisible ?? true} name="isVisible" type="checkbox" />
        在公开分类中显示
      </label>
    </div>
  );
}

function CategoryEditor({ category }: { category: AdminCategory }) {
  const [state, action] = useActionState(updateCategoryAction.bind(null, category.id), initialState);
  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{category.name}</h2>
          <p className="mt-1 text-sm text-slate-500">/{category.slug}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${category.isVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {category.isVisible ? "公开显示" : "已隐藏"}
        </span>
      </div>
      <CategoryFields category={category} prefix={`category-${category.id}`} state={state} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{state.message}</p>
        <SubmitButton pendingLabel="保存中…">保存分类</SubmitButton>
      </div>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [createState, createAction] = useActionState(createCategoryAction, initialState);
  return (
    <div className="space-y-8">
      <form action={createAction} className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">新建分类</h2>
        <p className="mt-1 text-sm text-slate-600">填写中文内容、公开状态和排序值。</p>
        <div className="mt-5"><CategoryFields prefix="new-category" state={createState} /></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-4">
          <p aria-live="polite" className={createState.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{createState.message}</p>
          <SubmitButton pendingLabel="创建中…">创建分类</SubmitButton>
        </div>
      </form>

      <section aria-labelledby="category-list-heading">
        <div className="mb-4">
          <h2 className="text-xl font-semibold" id="category-list-heading">现有分类</h2>
          <p className="mt-1 text-sm text-slate-500">共 {categories.length} 个分类。</p>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-semibold">还没有分类</h3>
            <p className="mt-2 text-sm text-slate-500">使用上方表单创建第一个分类。</p>
          </div>
        ) : (
          <div className="grid gap-4">{categories.map((category) => <CategoryEditor category={category} key={category.id} />)}</div>
        )}
      </section>
    </div>
  );
}
