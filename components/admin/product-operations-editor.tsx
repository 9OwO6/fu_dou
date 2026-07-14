"use client";

import { useActionState, useState } from "react";

import {
  saveProductOperationsAction,
  type MediaActionState,
} from "@/app/admin/(protected)/products/[id]/media-actions";

import { SubmitButton } from "./submit-button";

const initialState: MediaActionState = { status: "idle", message: "" };

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function ProductOperationsEditor({
  productId,
  productStatus,
  initialFeatured,
  initialPublishedAt,
}: {
  productId: string;
  productStatus: "draft" | "published" | "archived";
  initialFeatured: boolean;
  initialPublishedAt: string | null;
}) {
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt ?? "");
  const [state, formAction] = useActionState(saveProductOperationsAction.bind(null, productId), initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <input name="publishedAt" type="hidden" value={publishedAt} />
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">
          <input defaultChecked={initialFeatured} className="h-4 w-4" name="isFeatured" type="checkbox" />
          推荐商品
        </label>
        <label className="text-sm font-medium">
          新品发布时间
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            onInput={(event) => setPublishedAt(toIsoDateTime(event.currentTarget.value))}
            required={productStatus === "published"}
            type="datetime-local"
            value={toLocalDateTime(publishedAt)}
          />
        </label>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        发布时间同时作为新品排序依据。已发布商品若设置未来时间，在该时间到达前不会进入公开查询；推荐状态不会绕过发布状态。
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>
        <SubmitButton pendingLabel="保存运营状态中…">保存运营状态</SubmitButton>
      </div>
    </form>
  );
}
