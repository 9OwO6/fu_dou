"use client";

import { useActionState } from "react";

import { saveProductCategoriesAction } from "@/app/admin/(protected)/products/[id]/category-actions";
import type { AdminProductCategorySelection } from "@/lib/catalog/admin-data";

import { SubmitButton } from "./submit-button";

const initialState = { status: "idle", message: "" } as const;

export function ProductCategorySelector({
  productId,
  selection,
}: {
  productId: string;
  selection: AdminProductCategorySelection;
}) {
  const [state, formAction] = useActionState(
    saveProductCategoriesAction.bind(null, productId),
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">商品分类</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            同一商品可以同时属于多个分类，例如水杯可以出现在“餐具”“杯具水壶”和“礼物精选”。
          </p>
        </div>
        <SubmitButton pendingLabel="保存中…">保存分类</SubmitButton>
      </div>
      {selection.categories.length > 0 ? (
        <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">选择商品所属分类</legend>
          {selection.categories.map((category) => (
            <label
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50"
              key={category.id}
            >
              <input
                className="mt-1 size-4 accent-sky-700"
                defaultChecked={selection.selectedIds.includes(category.id)}
                name="categoryIds"
                type="checkbox"
                value={category.id}
              />
              <span>
                <span className="block font-semibold">{category.name}</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  {category.isVisible ? "公开显示" : "当前隐藏"} · /{category.slug}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          还没有分类。请先前往“分类管理”创建分类。
        </p>
      )}
      <p
        aria-live="polite"
        className={`mt-4 text-sm ${state.status === "error" ? "text-rose-700" : "text-emerald-700"}`}
        role={state.status === "error" ? "alert" : undefined}
      >
        {state.message}
      </p>
    </form>
  );
}
