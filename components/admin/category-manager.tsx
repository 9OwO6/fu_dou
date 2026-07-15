"use client";

import { useActionState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/admin/(protected)/categories/actions";
import type { AdminCategory } from "@/lib/catalog/admin-data";

import { SubmitButton } from "./submit-button";
import { ChevronIcon } from "./admin-icons";

const initialState: CategoryActionState = { status: "idle", message: "", fieldErrors: {} };
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#c9c3b8] bg-white px-3 py-2 text-[#292c30] outline-none transition placeholder:text-slate-400 hover:border-[#9f998f] focus:border-[#16758a] focus:ring-2 focus:ring-[#a9e3ea]/60";

function ErrorText({ id, children }: { id: string; children?: string }) {
  return children ? <p className="mt-1 text-sm text-rose-700" id={id}>{children}</p> : null;
}

function CategoryFields({ category, state, prefix }: { category?: AdminCategory; state: CategoryActionState; prefix: string }) {
  return (
    <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
      <label className="font-medium" htmlFor={`${prefix}-name`}>
        中文名称
        <input aria-describedby={state.fieldErrors.name ? `${prefix}-name-error` : undefined} aria-invalid={Boolean(state.fieldErrors.name)} className={inputClass} defaultValue={category?.name} id={`${prefix}-name`} maxLength={160} name="name" placeholder="请输入中文名称" required />
        <ErrorText id={`${prefix}-name-error`}>{state.fieldErrors.name}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-name-en`}>
        English name
        <input aria-describedby={state.fieldErrors.nameEn ? `${prefix}-name-en-error` : `${prefix}-name-en-help`} aria-invalid={Boolean(state.fieldErrors.nameEn)} className={inputClass} defaultValue={category?.nameEn} id={`${prefix}-name-en`} lang="en" maxLength={160} name="nameEn" placeholder="Enter English name" />
        <span className="mt-1 block text-sm font-normal text-[#62676d]" id={`${prefix}-name-en-help`}>留空时，此分类不会出现在英文站。</span>
        <ErrorText id={`${prefix}-name-en-error`}>{state.fieldErrors.nameEn}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-description`}>
        中文分类描述
        <textarea aria-describedby={state.fieldErrors.description ? `${prefix}-description-error` : undefined} aria-invalid={Boolean(state.fieldErrors.description)} className={inputClass} defaultValue={category?.description} id={`${prefix}-description`} maxLength={2000} name="description" placeholder="请输入中文分类描述" rows={4} />
        <ErrorText id={`${prefix}-description-error`}>{state.fieldErrors.description}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-description-en`}>
        English description
        <textarea aria-describedby={state.fieldErrors.descriptionEn ? `${prefix}-description-en-error` : undefined} aria-invalid={Boolean(state.fieldErrors.descriptionEn)} className={inputClass} defaultValue={category?.descriptionEn} id={`${prefix}-description-en`} lang="en" maxLength={2000} name="descriptionEn" placeholder="Enter English description" rows={4} />
        <ErrorText id={`${prefix}-description-en-error`}>{state.fieldErrors.descriptionEn}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-slug`}>
        网址标识
        <input aria-describedby={state.fieldErrors.slug ? `${prefix}-slug-error` : `${prefix}-slug-help`} aria-invalid={Boolean(state.fieldErrors.slug)} autoCapitalize="none" className={inputClass} defaultValue={category?.slug} id={`${prefix}-slug`} maxLength={160} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="例如 cups" required />
        <span className="mt-1 block text-sm font-normal text-[#62676d]" id={`${prefix}-slug-help`}>使用小写字母、数字和连字符。</span>
        <ErrorText id={`${prefix}-slug-error`}>{state.fieldErrors.slug}</ErrorText>
      </label>
      <label className="font-medium" htmlFor={`${prefix}-sort-order`}>
        排序值
        <input aria-describedby={state.fieldErrors.sortOrder ? `${prefix}-sort-error` : `${prefix}-sort-help`} aria-invalid={Boolean(state.fieldErrors.sortOrder)} className={inputClass} defaultValue={category?.sortOrder ?? 0} id={`${prefix}-sort-order`} max={99999} min={0} name="sortOrder" required step={1} type="number" />
        <span className="mt-1 block text-sm font-normal text-[#62676d]" id={`${prefix}-sort-help`}>数值越小越靠前。</span>
        <ErrorText id={`${prefix}-sort-error`}>{state.fieldErrors.sortOrder}</ErrorText>
      </label>
      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e5e0d7] bg-white px-4 py-3 font-medium lg:col-span-2">
        <input className="size-4 accent-sky-700" defaultChecked={category?.isVisible ?? true} name="isVisible" type="checkbox" />
        在公开分类中显示
      </label>
    </div>
  );
}

function CategoryEditor({ category }: { category: AdminCategory }) {
  const [state, action] = useActionState(updateCategoryAction.bind(null, category.id), initialState);
  return (
    <details className="group border-t border-[#e5e0d7] first:border-t-0" open={state.status === "error"}>
      <summary className="grid min-h-20 cursor-pointer list-none items-center gap-3 px-5 py-4 transition hover:bg-[#fffdf8] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#16758a] sm:grid-cols-[minmax(180px,1.4fr)_90px_120px_130px_100px] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fff7c2] text-lg font-bold">{category.name.slice(0, 1)}</span>
          <span className="min-w-0"><span className="block truncate font-semibold">{category.name}</span><span className="mt-0.5 block truncate font-mono text-xs text-[#62676d]">/{category.slug}</span></span>
        </span>
        <span className="text-sm tabular-nums text-[#62676d]"><span className="sm:hidden">排序：</span>{category.sortOrder}</span>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${category.isVisible ? "bg-[#edf6de] text-[#3d7540]" : "bg-slate-100 text-slate-600"}`}>{category.isVisible ? "公开显示" : "已隐藏"}</span>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${category.nameEn ? "bg-[#e8f7f9] text-[#24697a]" : "bg-[#fff7c2] text-[#8a5c00]"}`}>{category.nameEn ? "英文已填写" : "英文缺失"}</span>
        <span className="flex items-center justify-end gap-2 text-sm font-semibold">编辑 <ChevronIcon className="size-4 transition group-open:rotate-180" /></span>
      </summary>
      <form action={action} className="border-t border-[#e5e0d7] bg-[#fffdf8]/60 p-5 sm:p-6">
        <CategoryFields category={category} prefix={`category-${category.id}`} state={state} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e0d7] pt-5">
          <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{state.message}</p>
          <SubmitButton pendingLabel="保存中…">保存分类</SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [createState, createAction] = useActionState(createCategoryAction, initialState);
  return (
    <div className="space-y-10">
      <form action={createAction} className="rounded-2xl border border-[#e5e0d7] bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">新建分类</h2>
        <p className="mt-1 text-sm leading-6 text-[#62676d]">填写中英文内容、公开状态和排序值；英文名称缺失时只在中文站显示。</p>
        <div className="mt-6"><CategoryFields prefix="new-category" state={createState} /></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e0d7] pt-5">
          <p aria-live="polite" className={createState.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{createState.message}</p>
          <SubmitButton pendingLabel="创建中…">创建分类</SubmitButton>
        </div>
      </form>

      <section aria-labelledby="category-list-heading">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold" id="category-list-heading">现有分类</h2>
          <p className="mt-1 text-sm text-[#62676d]">共 {categories.length} 个分类。点击任意一行即可展开编辑。</p>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-semibold">还没有分类</h3>
            <p className="mt-2 text-sm text-slate-500">使用上方表单创建第一个分类。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e5e0d7] bg-white">{categories.map((category) => <CategoryEditor category={category} key={category.id} />)}</div>
        )}
      </section>
    </div>
  );
}
