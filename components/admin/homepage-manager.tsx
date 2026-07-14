"use client";

/* eslint-disable @next/next/no-img-element */
import { useActionState, useState } from "react";

import { saveHomepageAction, type HomepageActionState } from "@/app/admin/(protected)/homepage/actions";
import type { HomepageAdminChoices } from "@/lib/homepage/data";
import {
  controlledCtaTargets,
  getSection,
  homepageSectionLabels,
  homepageSectionTypes,
  parseHomepageForm,
  type HomepageConfiguration,
  type HomepageSection,
  type HomepageSectionType,
} from "@/lib/homepage/schema";

import { SubmitButton } from "./submit-button";

const initialState: HomepageActionState = { status: "idle", message: "", fieldErrors: {} };
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

const ctaLabels: Record<(typeof controlledCtaTargets)[number], string> = {
  "/products": "全部商品",
  "/collections/new": "新品集合",
  "/collections/featured": "推荐集合",
  "/collections/sale": "特价集合",
  "#fulfillment": "首页履约说明",
  "#faq": "首页 FAQ",
};

function ErrorText({ error }: { error?: string }) {
  return error ? <span className="mt-1 block text-sm text-rose-700">{error}</span> : null;
}

function TextField({
  label,
  name,
  value,
  error,
  maximum,
  multiline = false,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  maximum: number;
  multiline?: boolean;
  required?: boolean;
}) {
  const id = name.replaceAll(".", "-");
  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}{required ? <span aria-hidden="true"> *</span> : null}
      {multiline ? (
        <textarea aria-invalid={Boolean(error)} className={inputClass} defaultValue={value} id={id} maxLength={maximum} name={name} required={required} rows={3} />
      ) : (
        <input aria-invalid={Boolean(error)} className={inputClass} defaultValue={value} id={id} maxLength={maximum} name={name} required={required} />
      )}
      <ErrorText error={error} />
    </label>
  );
}

function SectionFrame({
  section,
  errors,
  children,
}: {
  section: HomepageSection;
  errors: Record<string, string>;
  children: React.ReactNode;
}) {
  const prefix = `section.${section.sectionType}`;
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <legend className="px-2 text-lg font-semibold">{homepageSectionLabels[section.sectionType]}</legend>
      <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_180px]">
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input className="size-4 accent-sky-700" defaultChecked={section.isEnabled} name={`${prefix}.enabled`} type="checkbox" />
          在公开首页显示
        </label>
        <label className="text-sm font-medium">
          排序值
          <input className={inputClass} defaultValue={section.sortOrder} max={99999} min={0} name={`${prefix}.sortOrder`} required step={1} type="number" />
          <ErrorText error={errors[`${prefix}.sortOrder`]} />
        </label>
      </div>
      {children}
    </fieldset>
  );
}

function CommonContent({ section, errors, showCta = false }: { section: HomepageSection; errors: Record<string, string>; showCta?: boolean }) {
  const prefix = `section.${section.sectionType}`;
  return (
    <div className="grid gap-4">
      {section.sectionType !== "announcement" ? <TextField error={errors[`${prefix}.heading`]} label="模块标题" maximum={160} name={`${prefix}.heading`} value={section.translation.heading} /> : null}
      <TextField error={errors[`${prefix}.body`]} label={section.sectionType === "announcement" ? "公告文字" : "模块说明"} maximum={5000} multiline name={`${prefix}.body`} value={section.translation.body} />
      {showCta ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField error={errors[`${prefix}.ctaLabel`]} label="按钮文案" maximum={80} name={`${prefix}.ctaLabel`} value={section.translation.ctaLabel} />
          <label className="text-sm font-medium">按钮目标
            <select className={inputClass} defaultValue={section.translation.ctaHref} name={`${prefix}.ctaHref`}>
              <option value="">不显示按钮</option>
              {controlledCtaTargets.map((target) => <option key={target} value={target}>{ctaLabels[target]}</option>)}
            </select>
            <ErrorText error={errors[`${prefix}.ctaHref`]} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function ImageChoice({ section, choices, errors }: { section: HomepageSection; choices: HomepageAdminChoices; errors: Record<string, string> }) {
  const name = `section.${section.sectionType}.imageId`;
  const selected = section.settings.imageId ?? "";
  const preview = choices.images.find((image) => image.id === selected);
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_180px]">
      <label className="text-sm font-medium">受控商品图片
        <select className={inputClass} defaultValue={selected} name={name}>
          <option value="">使用品牌默认图片</option>
          {choices.images.map((image) => <option key={image.id} value={image.id}>{image.label}</option>)}
        </select>
        <span className="mt-1 block text-xs font-normal text-slate-500">只能选择商品后台已登记的图片，不能粘贴任意外部 URL。</span>
        <ErrorText error={errors[name]} />
      </label>
      <div className="grid min-h-28 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
        {preview?.url ? <img alt={preview.label} className="h-28 w-full object-cover" src={preview.url} /> : "品牌默认图片"}
      </div>
    </div>
  );
}

function SelectionChecklist({
  name,
  values,
  options,
  error,
}: {
  name: string;
  values: string[];
  options: Array<{ id: string; label: string; note?: string }>;
  error?: string;
}) {
  return (
    <div>
      <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
        {options.length === 0 ? <p className="text-sm text-slate-500">暂无可选内容。</p> : options.map((option) => (
          <label className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50" key={option.id}>
            <input className="mt-0.5 size-4 accent-sky-700" defaultChecked={values.includes(option.id)} name={name} type="checkbox" value={option.id} />
            <span><strong className="block font-medium">{option.label}</strong>{option.note ? <small className="text-slate-500">{option.note}</small> : null}</span>
          </label>
        ))}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

function SectionEditor({ section, choices, errors }: { section: HomepageSection; choices: HomepageAdminChoices; errors: Record<string, string> }) {
  const prefix = `section.${section.sectionType}`;
  if (section.sectionType === "announcement") {
    return <SectionFrame errors={errors} section={section}><CommonContent errors={errors} section={section} /></SectionFrame>;
  }
  if (section.sectionType === "hero" || section.sectionType === "brand_story") {
    return (
      <SectionFrame errors={errors} section={section}>
        <div className="grid gap-5"><CommonContent errors={errors} section={section} showCta={section.sectionType === "hero"} /><ImageChoice choices={choices} errors={errors} section={section} /></div>
      </SectionFrame>
    );
  }
  if (section.sectionType === "featured_categories") {
    return (
      <SectionFrame errors={errors} section={section}>
        <div className="grid gap-5"><CommonContent errors={errors} section={section} /><div><p className="mb-2 text-sm font-medium">选择热门分类（最多 6 个）</p><SelectionChecklist error={errors[`${prefix}.categoryIds`]} name={`${prefix}.categoryIds`} options={choices.categories.map((category) => ({ id: category.id, label: category.name, note: category.isVisible ? "公开" : "已隐藏，前台会安全跳过" }))} values={section.settings.categoryIds ?? []} /></div></div>
      </SectionFrame>
    );
  }
  if (section.sectionType === "new_products" || section.sectionType === "featured_products" || section.sectionType === "sale_products") {
    return (
      <SectionFrame errors={errors} section={section}>
        <div className="grid gap-5">
          <CommonContent errors={errors} section={section} showCta />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">选品方式
              <select className={inputClass} defaultValue={section.settings.selectionMode ?? "automatic"} name={`${prefix}.selectionMode`}>
                <option value="automatic">自动按模块规则</option><option value="manual">手动选择并排序</option>
              </select>
            </label>
            <label className="text-sm font-medium">显示数量（1–8）
              <input className={inputClass} defaultValue={section.settings.limit ?? 4} max={8} min={1} name={`${prefix}.limit`} required step={1} type="number" />
              <ErrorText error={errors[`${prefix}.limit`]} />
            </label>
          </div>
          <div><p className="mb-2 text-sm font-medium">手动选品（最多 8 个，勾选顺序即展示顺序）</p><SelectionChecklist error={errors[`${prefix}.productIds`]} name={`${prefix}.productIds`} options={choices.products.map((product) => ({ id: product.id, label: product.title, note: product.status === "published" ? "已发布" : product.status === "draft" ? "草稿，前台会安全跳过" : "已归档，前台会安全跳过" }))} values={section.settings.productIds ?? []} /></div>
        </div>
      </SectionFrame>
    );
  }
  if (section.sectionType === "fulfillment") {
    const content = section.translation.content;
    return (
      <SectionFrame errors={errors} section={section}>
        <div className="grid gap-5"><CommonContent errors={errors} section={section} /><div className="grid gap-4 md:grid-cols-2"><TextField error={errors[`${prefix}.pickupTitle`]} label="自取标题" maximum={120} name={`${prefix}.pickupTitle`} value={content.pickupTitle ?? ""} /><TextField error={errors[`${prefix}.deliveryTitle`]} label="配送标题" maximum={120} name={`${prefix}.deliveryTitle`} value={content.deliveryTitle ?? ""} /><TextField error={errors[`${prefix}.pickupBody`]} label="自取说明" maximum={2000} multiline name={`${prefix}.pickupBody`} value={content.pickupBody ?? ""} /><TextField error={errors[`${prefix}.deliveryBody`]} label="配送说明" maximum={2000} multiline name={`${prefix}.deliveryBody`} value={content.deliveryBody ?? ""} /></div></div>
      </SectionFrame>
    );
  }
  if (section.sectionType === "faq") {
    const items = section.translation.content.items ?? [];
    return (
      <SectionFrame errors={errors} section={section}>
        <div className="grid gap-5"><CommonContent errors={errors} section={section} /><div className="grid gap-4">{Array.from({ length: 5 }, (_, index) => <div className="grid gap-3 rounded-xl border border-slate-200 p-4" key={index}><p className="text-sm font-semibold">问题 {index + 1}</p><TextField error={errors[`${prefix}.faq.${index}.question`]} label="问题" maximum={200} name={`${prefix}.faq.${index}.question`} value={items[index]?.question ?? ""} /><TextField error={errors[`${prefix}.faq.${index}.answer`]} label="答案" maximum={2000} multiline name={`${prefix}.faq.${index}.answer`} value={items[index]?.answer ?? ""} /></div>)}</div><ErrorText error={errors[`${prefix}.faq`]} /></div>
      </SectionFrame>
    );
  }
  return <SectionFrame errors={errors} section={section}><CommonContent errors={errors} section={section} showCta /></SectionFrame>;
}

function SafePreview({ configuration }: { configuration: HomepageConfiguration }) {
  const visible = configuration.sections.filter((section) => section.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <aside className="sticky top-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">受控实时预览</p>
      <h2 className="mt-2 text-lg font-semibold text-sky-950">公开首页模块顺序</h2>
      <p className="mt-2 text-sm leading-6 text-sky-900">预览仅使用 React 纯文本节点，不解析 HTML 或脚本。保存后可用页面顶部链接查看真实首页。</p>
      {visible.length === 0 ? <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">所有模块均已隐藏。</p> : <ol className="mt-4 grid gap-2">{visible.map((section) => <li className="rounded-xl border border-sky-100 bg-white p-3" key={section.sectionType}><span className="text-xs font-semibold text-sky-700">{section.sortOrder}</span><strong className="ml-2 text-sm">{homepageSectionLabels[section.sectionType]}</strong><p className="mt-1 line-clamp-2 text-xs text-slate-600">{section.translation.heading || section.translation.body || "暂无文案"}</p></li>)}</ol>}
    </aside>
  );
}

export function HomepageManager({ initialConfiguration, choices }: { initialConfiguration: HomepageConfiguration; choices: HomepageAdminChoices }) {
  const [state, action] = useActionState(saveHomepageAction, initialState);
  const [preview, setPreview] = useState(initialConfiguration);
  const sections = homepageSectionTypes.map((type: HomepageSectionType) => getSection(initialConfiguration, type)!);
  return (
    <form action={action} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" onInput={(event) => { const parsed = parseHomepageForm(new FormData(event.currentTarget)); if (parsed.success) setPreview(parsed.value); }}>
      <div className="grid gap-6">
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <legend className="px-2 text-lg font-semibold">联系与履约开关</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField error={state.fieldErrors["site.contactEmail"]} label="公开联系邮箱" maximum={320} name="site.contactEmail" value={initialConfiguration.siteSettings.contactEmail} />
            <TextField error={state.fieldErrors["site.contactPhone"]} label="公开联系电话（可选）" maximum={40} name="site.contactPhone" value={initialConfiguration.siteSettings.contactPhone} />
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"><input className="size-4 accent-sky-700" defaultChecked={initialConfiguration.siteSettings.pickupEnabled} name="site.pickupEnabled" type="checkbox" />开放自取说明</label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"><input className="size-4 accent-sky-700" defaultChecked={initialConfiguration.siteSettings.localDeliveryEnabled} name="site.localDeliveryEnabled" type="checkbox" />开放本地配送说明</label>
            <div className="md:col-span-2"><TextField error={state.fieldErrors["site.serviceAreaDescription"]} label="服务区域补充说明" maximum={1000} multiline name="site.serviceAreaDescription" value={initialConfiguration.siteSettings.serviceAreaDescription} /></div>
          </div>
        </fieldset>
        {sections.map((section) => <SectionEditor choices={choices} errors={state.fieldErrors} key={section.sectionType} section={section} />)}
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p aria-live="polite" className={state.status === "error" ? "text-sm font-medium text-rose-700" : "text-sm font-medium text-emerald-700"} role={state.status === "error" ? "alert" : "status"}>{state.message || "保存时会再次在服务器和数据库校验全部模块。"}</p>
          <SubmitButton pendingLabel="保存并更新首页中…">保存全部首页配置</SubmitButton>
        </div>
      </div>
      <SafePreview configuration={preview} />
    </form>
  );
}
