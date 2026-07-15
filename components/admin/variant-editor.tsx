"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveVariantConfigurationAction,
  type VariantActionState,
} from "@/app/admin/(protected)/products/[id]/variant-actions";
import type {
  VariantConfiguration,
  VariantInput,
  VariantOptionInput,
} from "@/lib/catalog/variant-validation";

import { SubmitButton } from "./submit-button";

const initialActionState: VariantActionState = { status: "idle", message: "", fieldErrors: {} };
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100";

function signature(valueIds: string[]) {
  return [...valueIds].sort().join("|");
}

function combinations(options: VariantOptionInput[]) {
  if (options.length === 0) return [[]];
  return options.reduce<string[][]>(
    (current, option) => current.flatMap((item) => option.values.map((value) => [...item, value.id])),
    [[]],
  );
}

function variantLabel(variant: VariantInput, options: VariantOptionInput[]) {
  if (options.length === 0) return "默认商品";
  const labels = new Map(options.flatMap((option) => option.values.map((value) => [value.id, value.label])));
  return variant.optionValueIds.map((id) => labels.get(id) || "未命名值").join(" / ");
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-rose-700">{message}</p> : null;
}

function toLocalDateTime(value: string) {
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

export function VariantEditor({ productId, initialConfiguration }: { productId: string; initialConfiguration: VariantConfiguration }) {
  const [options, setOptions] = useState(initialConfiguration.options);
  const [variants, setVariants] = useState(initialConfiguration.variants);
  const [state, formAction] = useActionState(saveVariantConfigurationAction.bind(null, productId), initialActionState);
  const [batchPrice, setBatchPrice] = useState("");
  const [batchCompare, setBatchCompare] = useState("");
  const [batchStock, setBatchStock] = useState("");

  const configuration = useMemo(() => ({ options, variants }), [options, variants]);

  function updateOption(optionIndex: number, next: Partial<VariantOptionInput>) {
    setOptions((current) => current.map((option, index) => index === optionIndex ? { ...option, ...next } : option));
  }

  function addOption() {
    setOptions((current) => [...current, {
      id: crypto.randomUUID(),
      label: "",
      labelEn: "",
      values: [{ id: crypto.randomUUID(), label: "", labelEn: "" }],
    }]);
  }

  function removeOption(optionIndex: number) {
    setOptions((current) => current.filter((_, index) => index !== optionIndex));
  }

  function addValue(optionIndex: number) {
    const option = options[optionIndex];
    updateOption(optionIndex, { values: [...option.values, { id: crypto.randomUUID(), label: "", labelEn: "" }] });
  }

  function updateValue(optionIndex: number, valueIndex: number, field: "label" | "labelEn", label: string) {
    const option = options[optionIndex];
    updateOption(optionIndex, {
      values: option.values.map((value, index) => index === valueIndex ? { ...value, [field]: label } : value),
    });
  }

  function removeValue(optionIndex: number, valueIndex: number) {
    const option = options[optionIndex];
    updateOption(optionIndex, { values: option.values.filter((_, index) => index !== valueIndex) });
  }

  function synchronizeVariants() {
    const existing = new Map(variants.map((variant) => [signature(variant.optionValueIds), variant]));
    setVariants(combinations(options).map((optionValueIds) => {
      const saved = existing.get(signature(optionValueIds));
      return saved ?? {
        id: crypto.randomUUID(),
        optionValueIds,
        sku: "",
        priceCad: "",
        compareAtPriceCad: "",
        saleStartsAt: "",
        saleEndsAt: "",
        stockQty: "0",
        isActive: true,
      };
    }));
  }

  function updateVariant(index: number, values: Partial<VariantInput>) {
    setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...values } : variant));
  }

  function applyBatch(field: "priceCad" | "compareAtPriceCad" | "stockQty", value: string) {
    setVariants((current) => current.map((variant) => ({ ...variant, [field]: value })));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input name="configuration" type="hidden" value={JSON.stringify(configuration)} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="options-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="options-heading">规格名称和值</h2>
            <p className="mt-1 text-sm text-slate-600">每个规格名称和值同时维护中文与 English。英文缺失时商品不会进入英文站；无可选规格商品保持这里为空。</p>
          </div>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" onClick={addOption} type="button">添加规格</button>
        </div>
        <FieldError message={state.fieldErrors.options} />

        {options.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">这是无规格商品。点击下方“生成/同步组合”会建立唯一的默认商品组合。</div>
        ) : (
          <div className="mt-5 grid gap-4">
            {options.map((option, optionIndex) => (
              <fieldset className="rounded-xl border border-slate-200 p-4" key={option.id}>
                <legend className="px-1 text-sm font-semibold">规格 {optionIndex + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                  <label className="min-w-0 text-sm font-medium">
                    中文规格名称
                    <input className={`${inputClass} mt-1`} maxLength={100} onChange={(event) => updateOption(optionIndex, { label: event.target.value })} placeholder="例如：款式" value={option.label} />
                    <FieldError message={state.fieldErrors[`options.${optionIndex}.label`]} />
                  </label>
                  <label className="min-w-0 text-sm font-medium">
                    English option name
                    <input className={`${inputClass} mt-1`} lang="en" maxLength={100} onChange={(event) => updateOption(optionIndex, { labelEn: event.target.value })} placeholder="For example: Style" value={option.labelEn} />
                    <FieldError message={state.fieldErrors[`options.${optionIndex}.labelEn`]} />
                  </label>
                  <button className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 sm:mt-6" onClick={() => removeOption(optionIndex)} type="button">删除规格</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {option.values.map((value, valueIndex) => (
                    <div className="rounded-xl border border-slate-200 p-3" key={value.id}>
                      <p className="text-sm font-semibold">规格值 {valueIndex + 1}</p>
                      <label className="mt-2 block text-sm font-medium">中文值
                        <input className={`${inputClass} mt-1`} maxLength={100} onChange={(event) => updateValue(optionIndex, valueIndex, "label", event.target.value)} placeholder="例如：猫猫" value={value.label} />
                        <FieldError message={state.fieldErrors[`options.${optionIndex}.values.${valueIndex}.label`]} />
                      </label>
                      <label className="mt-2 block text-sm font-medium">English value
                        <input className={`${inputClass} mt-1`} lang="en" maxLength={100} onChange={(event) => updateValue(optionIndex, valueIndex, "labelEn", event.target.value)} placeholder="For example: Cat" value={value.labelEn} />
                        <FieldError message={state.fieldErrors[`options.${optionIndex}.values.${valueIndex}.labelEn`]} />
                      </label>
                      <span className="mt-3 flex justify-end">
                        <button aria-label={`删除规格值 ${value.label || valueIndex + 1}`} className="min-h-11 shrink-0 rounded-xl border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" onClick={() => removeValue(optionIndex, valueIndex)} type="button">删除</button>
                      </span>
                    </div>
                  ))}
                </div>
                <FieldError message={state.fieldErrors[`options.${optionIndex}.values`]} />
                <button className="mt-4 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" onClick={() => addValue(optionIndex)} type="button">添加规格值</button>
              </fieldset>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
          <button className="rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" onClick={synchronizeVariants} type="button">生成/同步组合</button>
          <p className="text-sm text-slate-600">修改规格或值后必须重新同步。已有相同组合的 SKU、价格和库存会保留。</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="batch-heading">
        <h2 className="text-lg font-semibold" id="batch-heading">批量修改</h2>
        <p className="mt-1 text-sm text-slate-600">批量值只会更新当前页面中的所有组合，仍需点击最下方保存。</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="text-sm font-medium">CAD 价格
            <span className="mt-1 flex gap-2"><input className={inputClass} inputMode="decimal" min="0.01" onChange={(event) => setBatchPrice(event.target.value)} placeholder="例如 24.00" step="0.01" type="number" value={batchPrice} /><button className="shrink-0 rounded-xl border border-slate-300 px-3 font-semibold hover:bg-slate-50" disabled={!batchPrice} onClick={() => applyBatch("priceCad", batchPrice)} type="button">应用</button></span>
          </label>
          <label className="text-sm font-medium">原价（可留空后应用以清除）
            <span className="mt-1 flex gap-2"><input className={inputClass} inputMode="decimal" min="0.01" onChange={(event) => setBatchCompare(event.target.value)} placeholder="例如 29.00" step="0.01" type="number" value={batchCompare} /><button className="shrink-0 rounded-xl border border-slate-300 px-3 font-semibold hover:bg-slate-50" onClick={() => applyBatch("compareAtPriceCad", batchCompare)} type="button">应用</button></span>
          </label>
          <label className="text-sm font-medium">库存
            <span className="mt-1 flex gap-2"><input className={inputClass} inputMode="numeric" min="0" onChange={(event) => setBatchStock(event.target.value)} placeholder="例如 5" step="1" type="number" value={batchStock} /><button className="shrink-0 rounded-xl border border-slate-300 px-3 font-semibold hover:bg-slate-50" disabled={batchStock === ""} onClick={() => applyBatch("stockQty", batchStock)} type="button">应用</button></span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="variants-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold" id="variants-heading">规格组合</h2><p className="mt-1 text-sm text-slate-600">共 {variants.length} 个组合。禁用代表该组合不销售，但库存记录会保留。</p></div>
          <p className="text-sm font-semibold text-slate-700">币种固定为 CAD</p>
        </div>
        <FieldError message={state.fieldErrors.variants} />

        {variants.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">尚未生成组合。请先检查规格和值，再点击“生成/同步组合”。</div>
        ) : (
          <div className="mt-5 grid gap-4">
            {variants.map((variant, index) => (
              <fieldset className={`rounded-xl border p-4 ${variant.isActive ? "border-slate-200" : "border-slate-300 bg-slate-50"}`} key={variant.id}>
                <legend className="px-1 font-semibold">{variantLabel(variant, options)}</legend>
                <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="text-sm font-medium">SKU
                    <input className={`${inputClass} mt-1 font-mono`} maxLength={100} onChange={(event) => updateVariant(index, { sku: event.target.value })} value={variant.sku} />
                    <FieldError message={state.fieldErrors[`variants.${index}.sku`]} />
                  </label>
                  <label className="text-sm font-medium">CAD 价格
                    <input className={`${inputClass} mt-1`} inputMode="decimal" min="0.01" onChange={(event) => updateVariant(index, { priceCad: event.target.value })} step="0.01" type="number" value={variant.priceCad} />
                    <FieldError message={state.fieldErrors[`variants.${index}.priceCad`]} />
                  </label>
                  <label className="text-sm font-medium">原价
                    <input className={`${inputClass} mt-1`} inputMode="decimal" min="0.01" onChange={(event) => updateVariant(index, { compareAtPriceCad: event.target.value })} placeholder="可留空" step="0.01" type="number" value={variant.compareAtPriceCad} />
                    <FieldError message={state.fieldErrors[`variants.${index}.compareAtPriceCad`]} />
                  </label>
                  <label className="text-sm font-medium">库存
                    <input className={`${inputClass} mt-1`} inputMode="numeric" min="0" onChange={(event) => updateVariant(index, { stockQty: event.target.value })} step="1" type="number" value={variant.stockQty} />
                    <FieldError message={state.fieldErrors[`variants.${index}.stockQty`]} />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium">
                    <input checked={variant.isActive} className="h-4 w-4" onChange={(event) => updateVariant(index, { isActive: event.target.checked })} type="checkbox" />
                    {variant.isActive ? "启用销售" : "已禁用"}
                  </label>
                </div>
                <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                  <label className="text-sm font-medium">特价开始时间（可选）
                    <input className={`${inputClass} mt-1`} onInput={(event) => updateVariant(index, { saleStartsAt: toIsoDateTime(event.currentTarget.value) })} type="datetime-local" value={toLocalDateTime(variant.saleStartsAt)} />
                    <FieldError message={state.fieldErrors[`variants.${index}.saleStartsAt`]} />
                  </label>
                  <label className="text-sm font-medium">特价结束时间（可选）
                    <input className={`${inputClass} mt-1`} onInput={(event) => updateVariant(index, { saleEndsAt: toIsoDateTime(event.currentTarget.value) })} type="datetime-local" value={toLocalDateTime(variant.saleEndsAt)} />
                    <FieldError message={state.fieldErrors[`variants.${index}.saleEndsAt`]} />
                  </label>
                </div>
                <FieldError message={state.fieldErrors[`variants.${index}.saleWindow`]} />
                <FieldError message={state.fieldErrors[`variants.${index}.combination`]} />
              </fieldset>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>
        <SubmitButton pendingLabel="保存规格中…">保存规格、价格和库存</SubmitButton>
      </div>
    </form>
  );
}
