/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  readShowcaseImageDimensions,
  releaseShowcasePreviews,
  type PendingShowcaseImage,
  uploadAndPublishShowcaseBatch,
} from "@/lib/showcase/client-upload";
import type { ShowcaseTag } from "@/lib/showcase/data";
import {
  MAX_SHOWCASE_IMAGES,
  MAX_SHOWCASE_IMAGES_PER_ITEM,
  validateClientImageFile,
  type ShowcasePresentationPreset,
} from "@/lib/showcase/validation";

type DraftItem = {
  id: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  priceCad: string;
  tagIds: string[];
  images: PendingShowcaseImage[];
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";
const presentationOptions: Array<{
  value: ShowcasePresentationPreset;
  name: string;
  description: string;
  previewClass: string;
}> = [
  { value: "sunny_shelf", name: "阳光陈列架", description: "主推大卡配合整齐商品墙，适合日常稳定上新。", previewClass: "from-[#fff7c2] via-white to-[#eef9fb]" },
  { value: "joyful_scrapbook", name: "快乐手账拼贴", description: "照片、贴纸和轻微错落，更有 Happy Beans 的小店个性。", previewClass: "from-[#ffeaf2] via-[#fffdf8] to-[#e8f8d8]" },
  { value: "today_spotlight", name: "今日主推", description: "一件大幅主视觉带动本批新品，适合限定和少量到货。", previewClass: "from-[#dff6fa] via-[#fff7c2] to-white" },
];

function newDraft(image: PendingShowcaseImage, tagIds: string[] = []): DraftItem {
  return {
    id: crypto.randomUUID(),
    titleZh: "",
    titleEn: "",
    descriptionZh: "",
    descriptionEn: "",
    priceCad: "",
    tagIds,
    images: [image],
  };
}

export function QuickShowcaseUploader({ tags }: { tags: ShowcaseTag[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<DraftItem[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchTagId, setBatchTagId] = useState(tags[0]?.id ?? "");
  const [presentationPreset, setPresentationPreset] = useState<ShowcasePresentationPreset>("sunny_shelf");
  const [featuredItemId, setFeaturedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => () => releaseShowcasePreviews(itemsRef.current), []);

  function replaceItems(next: DraftItem[]) {
    itemsRef.current = next;
    setItems(next);
  }

  async function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const incoming = Array.from(files);
      const currentCount = items.reduce((sum, item) => sum + item.images.length, 0);
      if (currentCount + incoming.length > MAX_SHOWCASE_IMAGES) {
        setMessage(`每批最多选择 ${MAX_SHOWCASE_IMAGES} 张图片。`);
        return;
      }
      const created: DraftItem[] = [];
      for (const file of incoming) {
        const validation = validateClientImageFile(file);
        if (!validation.success) {
          created.flatMap((item) => item.images).forEach((image) => URL.revokeObjectURL(image.previewUrl));
          setMessage(validation.message);
          return;
        }
        const dimensions = await readShowcaseImageDimensions(file);
        created.push(newDraft({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          ...dimensions,
        }));
      }
      replaceItems([...items, ...created]);
      setMessage(`已加入 ${incoming.length} 张图片；当前默认每张图是一个展示商品。`);
    } catch {
      setMessage("图片读取失败，请重新选择 JPEG、PNG 或 WebP 文件。");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    replaceItems(items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function mergeSelected() {
    const picked = items.filter((item) => selected.has(item.id));
    if (picked.length < 2) {
      setMessage("请至少勾选两个展示商品再合并图片。 ");
      return;
    }
    const images = picked.flatMap((item) => item.images);
    if (images.length > MAX_SHOWCASE_IMAGES_PER_ITEM) {
      setMessage(`同一个展示商品最多保留 ${MAX_SHOWCASE_IMAGES_PER_ITEM} 张图片。`);
      return;
    }
    const first = picked[0];
    const merged: DraftItem = {
      ...first,
      images,
      tagIds: [...new Set(picked.flatMap((item) => item.tagIds))],
    };
    const firstIndex = items.findIndex((item) => item.id === first.id);
    const next = items.filter((item) => !selected.has(item.id));
    next.splice(firstIndex, 0, merged);
    replaceItems(next);
    setSelected(new Set([merged.id]));
    if (picked.some((item) => item.id === featuredItemId)) setFeaturedItemId(merged.id);
    setMessage(`已将 ${picked.length} 个商品合并为一个多图商品。`);
  }

  function splitItem(item: DraftItem) {
    if (item.images.length < 2) return;
    const index = items.findIndex((current) => current.id === item.id);
    const split = item.images.map((image, imageIndex) => imageIndex === 0
      ? { ...item, images: [image] }
      : newDraft(image, item.tagIds));
    const next = items.filter((current) => current.id !== item.id);
    next.splice(index, 0, ...split);
    replaceItems(next);
    setSelected(new Set());
    if (featuredItemId === item.id) setFeaturedItemId(split[0]?.id ?? null);
    setMessage(`已拆分为 ${split.length} 个单图商品。`);
  }

  function removeItem(item: DraftItem) {
    item.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    replaceItems(items.filter((current) => current.id !== item.id));
    if (featuredItemId === item.id) setFeaturedItemId(null);
    setSelected((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  function applyBatchTag() {
    if (!batchTagId || selected.size < 1) {
      setMessage("先勾选需要批量添加标签的商品。 ");
      return;
    }
    replaceItems(items.map((item) => selected.has(item.id)
      ? { ...item, tagIds: [...new Set([...item.tagIds, batchTagId])] }
      : item));
    setMessage(`已为 ${selected.size} 个商品添加标签。`);
  }

  async function publish() {
    if (!items.length) {
      setMessage("请先选择至少一张图片。 ");
      return;
    }
    setIsPublishing(true);
    setMessage("正在上传并安全登记本批新品，请不要关闭页面…");
    const result = await uploadAndPublishShowcaseBatch(
      crypto.randomUUID(),
      items,
      presentationPreset,
      featuredItemId ?? items[0]?.id ?? null,
    );
    setIsPublishing(false);
    setMessage(result.message);
    if (result.status === "success") {
      releaseShowcasePreviews(items);
      itemsRef.current = [];
      router.push("/admin/quick-listings?notice=published");
      router.refresh();
    }
  }

  const imageCount = items.reduce((sum, item) => sum + item.images.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5e0d7] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">1. 丢入本批全部图片</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">默认每张图片是一个商品；之后可勾选合并为同一商品的多张图。</p>
          </div>
          <span className="rounded-full bg-[#fff7c2] px-3 py-1 text-sm font-semibold">{items.length} 个商品 · {imageCount}/{MAX_SHOWCASE_IMAGES} 张图</span>
        </div>
        <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-[#a9dfe8] bg-[#f4fcfd] p-6 text-center font-semibold text-[#155f70] transition hover:border-[#62bdcf] focus-within:border-[#288ea3] focus-within:ring-2 focus-within:ring-[#a9dfe8]" htmlFor="showcase-files">
          选择 1–{MAX_SHOWCASE_IMAGES} 张 JPEG、PNG 或 WebP
        </label>
        <input ref={fileInput} accept="image/jpeg,image/png,image/webp" className="sr-only" id="showcase-files" multiple onChange={(event) => void selectFiles(event.target.files)} type="file" />
      </section>

      {items.length ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#e5e0d7] bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">2. 选择本批陈列效果</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">效果应用于整批新品；只能选择受控模板，不会修改正式商品页面。</p>
            </div>
            <fieldset className="mt-5 grid gap-4 lg:grid-cols-3">
              <legend className="sr-only">本批陈列效果</legend>
              {presentationOptions.map((option) => (
                <label className={`cursor-pointer overflow-hidden rounded-2xl border-2 transition ${presentationPreset === option.value ? "border-[#e2c200] ring-2 ring-[#f7e653]" : "border-slate-200 hover:border-sky-300"}`} key={option.value}>
                  <input className="sr-only" checked={presentationPreset === option.value} name="presentationPreset" onChange={() => setPresentationPreset(option.value)} type="radio" value={option.value} />
                  <span className={`grid h-28 grid-cols-3 items-end gap-2 bg-gradient-to-br p-4 ${option.previewClass}`} aria-hidden="true">
                    <span className={`rounded-lg bg-white/90 shadow-sm ${option.value === "today_spotlight" ? "col-span-2 h-20" : option.value === "joyful_scrapbook" ? "h-16 -rotate-3" : "h-20"}`} />
                    <span className={`rounded-lg bg-white/90 shadow-sm ${option.value === "joyful_scrapbook" ? "h-20 rotate-3" : "h-14"}`} />
                    {option.value !== "today_spotlight" ? <span className="h-12 rounded-lg bg-white/90 shadow-sm" /> : null}
                  </span>
                  <span className="block p-4"><strong className="block">{option.name}</strong><span className="mt-1 block text-sm leading-6 text-slate-600">{option.description}</span></span>
                </label>
              ))}
            </fieldset>
            <p className="mt-4 rounded-xl bg-[#f4fcfd] px-4 py-3 text-sm text-[#155f70]">主推商品：{featuredItemId ? `商品 ${items.findIndex((item) => item.id === featuredItemId) + 1}` : "自动使用第一件商品"}</p>
          </div>

          <div className="sticky top-20 z-20 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e5e0d7] bg-[#fffdf8]/95 p-4 shadow-sm backdrop-blur">
            <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50" onClick={mergeSelected} type="button">合并所选图片</button>
            <label className="min-w-48 text-sm font-semibold">批量标签
              <select className={`${inputClass} mt-1`} onChange={(event) => setBatchTagId(event.target.value)} value={batchTagId}>
                {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.nameZh || tag.slug}</option>)}
              </select>
            </label>
            <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50" onClick={applyBatchTag} type="button">应用到所选</button>
            <button className="ml-auto min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50" onClick={() => setSelected(new Set(items.map((item) => item.id)))} type="button">全选</button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {items.map((item, index) => (
              <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${selected.has(item.id) ? "border-[#e2c200] ring-2 ring-[#f7e653]" : "border-[#e5e0d7]"}`} key={item.id}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <label className="flex items-center gap-2 font-semibold"><input checked={selected.has(item.id)} onChange={() => toggleSelected(item.id)} type="checkbox" />商品 {index + 1}</label>
                  <div className="flex gap-2">
                    <button aria-pressed={featuredItemId === item.id} className={`text-sm font-semibold underline-offset-4 hover:underline ${featuredItemId === item.id ? "text-amber-700" : "text-sky-700"}`} onClick={() => setFeaturedItemId(featuredItemId === item.id ? null : item.id)} type="button">{featuredItemId === item.id ? "★ 本批主推" : "设为主推"}</button>
                    {item.images.length > 1 ? <button className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline" onClick={() => splitItem(item)} type="button">拆分图片</button> : null}
                    <button className="text-sm font-semibold text-rose-700 underline-offset-4 hover:underline" onClick={() => removeItem(item)} type="button">移除</button>
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
                  <div>
                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-100"><img alt="待发布商品预览" className="h-full w-full object-cover" src={item.images[0].previewUrl} /></div>
                    <p className="mt-2 text-center text-xs text-slate-500">{item.images.length} 张图片</p>
                    {item.images.length > 1 ? <div className="mt-2 flex gap-1 overflow-x-auto">{item.images.map((image) => <img alt="" className="size-10 shrink-0 rounded-md object-cover" key={image.id} src={image.previewUrl} />)}</div> : null}
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">中文名称（可不填）<input className={`${inputClass} mt-1`} maxLength={120} onChange={(event) => updateItem(item.id, { titleZh: event.target.value })} placeholder="例如：小熊玻璃杯" value={item.titleZh} /></label>
                    <label className="block text-sm font-semibold">English name（可不填）<input className={`${inputClass} mt-1`} maxLength={120} onChange={(event) => updateItem(item.id, { titleEn: event.target.value })} placeholder="Bear glass cup" value={item.titleEn} /></label>
                    <label className="block text-sm font-semibold">价格 CAD（可不填）<input className={`${inputClass} mt-1`} inputMode="decimal" onChange={(event) => updateItem(item.id, { priceCad: event.target.value })} placeholder="18.00" value={item.priceCad} /></label>
                    <details className="rounded-xl border border-slate-200 p-3">
                      <summary className="cursor-pointer font-semibold">可选说明与标签</summary>
                      <label className="mt-3 block text-sm font-semibold">中文说明<textarea className={`${inputClass} mt-1 min-h-20`} maxLength={500} onChange={(event) => updateItem(item.id, { descriptionZh: event.target.value })} value={item.descriptionZh} /></label>
                      <label className="mt-3 block text-sm font-semibold">English description<textarea className={`${inputClass} mt-1 min-h-20`} maxLength={500} onChange={(event) => updateItem(item.id, { descriptionEn: event.target.value })} value={item.descriptionEn} /></label>
                      <fieldset className="mt-3"><legend className="text-sm font-semibold">标签</legend><div className="mt-2 flex flex-wrap gap-2">{tags.map((tag) => <label className="rounded-full border border-slate-200 px-3 py-1.5 text-sm" key={tag.id}><input checked={item.tagIds.includes(tag.id)} className="mr-2" onChange={(event) => updateItem(item.id, { tagIds: event.target.checked ? [...item.tagIds, tag.id] : item.tagIds.filter((id) => id !== tag.id) })} type="checkbox" />{tag.nameZh || tag.slug}</label>)}</div></fieldset>
                    </details>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {message ? <p className={`rounded-xl border p-4 ${message.includes("失败") || message.includes("无效") || message.includes("请先") ? "border-rose-200 bg-rose-50 text-rose-800" : "border-sky-200 bg-sky-50 text-sky-900"}`} role="status">{message}</p> : null}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
        <Link className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50" href="/admin/quick-listings">返回管理墙</Link>
        <button className="min-h-11 rounded-xl border border-[#e2c200] bg-[#f7e653] px-6 py-3 font-semibold text-[#292c30] shadow-sm transition hover:bg-[#f3dc2f] disabled:cursor-not-allowed disabled:opacity-50" disabled={isPublishing || !items.length} onClick={() => void publish()} type="button">{isPublishing ? "正在上传并发布…" : `发布 ${items.length} 个展示商品`}</button>
      </div>
    </div>
  );
}
