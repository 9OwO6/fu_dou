/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveShowcaseDisplaySetAction } from "@/app/admin/(protected)/quick-listings/actions";
import type { AdminShowcaseItem, ShowcaseDisplaySet } from "@/lib/showcase/data";
import type { ShowcaseDisplayPreset } from "@/lib/showcase/validation";

const presetOptions: Array<{ value: ShowcaseDisplayPreset; name: string; description: string }> = [
  { value: "sunny_shelf", name: "新品橱窗", description: "一件主推大图带动其余新品，适合 2–4 件商品。" },
  { value: "joyful_scrapbook", name: "快乐手账", description: "把整组照片放进一张手账画布，适合 3–8 件商品。" },
];

function StageMiniPreview({ items, preset, featuredItemId }: {
  items: AdminShowcaseItem[];
  preset: ShowcaseDisplayPreset;
  featuredItemId: string;
}) {
  const ordered = [...items].sort((a, b) => Number(b.id === featuredItemId) - Number(a.id === featuredItemId));
  return (
    <div className={`relative min-h-48 overflow-hidden rounded-2xl border p-4 ${preset === "joyful_scrapbook" ? "border-rose-100 bg-[#fffaf2]" : "border-sky-100 bg-gradient-to-br from-[#fff7c2] via-white to-[#e8f7f9]"}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-bold tracking-[.16em] text-sky-800">NEW DROP</span><span className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold">{ordered.length} 件</span></div>
      <div className={`grid gap-2 ${preset === "joyful_scrapbook" ? "grid-cols-3 items-center" : "grid-cols-2"}`}>
        {ordered.slice(0, 4).map((item, index) => (
          <div className={`${preset === "joyful_scrapbook" ? `border-4 border-white bg-white shadow ${index % 2 ? "rotate-2 translate-y-3" : "-rotate-2"}` : item.id === featuredItemId ? "row-span-2" : ""}`} key={item.id}>
            <div className={`${preset === "joyful_scrapbook" ? "aspect-[4/5]" : item.id === featuredItemId ? "h-32" : "h-[60px]"} overflow-hidden rounded-sm bg-slate-100`}>
              {item.images[0]?.signedUrl ? <img alt="" className="h-full w-full object-cover" src={item.images[0].signedUrl} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShowcaseStageEditor({ initialDisplaySet, items }: {
  initialDisplaySet: ShowcaseDisplaySet;
  items: AdminShowcaseItem[];
}) {
  const router = useRouter();
  const eligibleItems = useMemo(() => items.filter((item) => item.availability !== "archived"), [items]);
  const itemMap = useMemo(() => new Map(eligibleItems.map((item) => [item.id, item])), [eligibleItems]);
  const [selectedIds, setSelectedIds] = useState(initialDisplaySet.itemIds.filter((id) => itemMap.has(id)));
  const [preset, setPreset] = useState<ShowcaseDisplayPreset>(initialDisplaySet.presentationPreset);
  const [featuredItemId, setFeaturedItemId] = useState(initialDisplaySet.featuredItemId);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedItems = selectedIds.map((id) => itemMap.get(id)).filter((item): item is AdminShowcaseItem => Boolean(item));

  function toggleItem(itemId: string) {
    if (selectedIds.includes(itemId)) {
      const next = selectedIds.filter((id) => id !== itemId);
      setSelectedIds(next);
      if (featuredItemId === itemId) setFeaturedItemId(next[0] ?? "");
      return;
    }
    if (selectedIds.length >= 8) {
      setMessage("当前新品展台最多展示 8 件商品。");
      return;
    }
    setSelectedIds([...selectedIds, itemId]);
    if (!featuredItemId) setFeaturedItemId(itemId);
  }

  function move(itemId: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedIds(next);
  }

  function save() {
    startTransition(async () => {
      const result = await saveShowcaseDisplaySetAction(selectedIds, preset, featuredItemId);
      setMessage(result.message);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <section aria-labelledby="showcase-stage-heading" className="overflow-hidden rounded-3xl border border-[#cbe8ec] bg-white">
      <div className="grid gap-6 bg-[#f4fcfd] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)] lg:p-6">
        <div>
          <p className="text-xs font-bold tracking-[.14em] text-sky-800">CURRENT NEW-ARRIVALS STAGE</p>
          <h2 className="mt-2 text-2xl font-semibold" id="showcase-stage-heading">当前新品展台</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">从不同上传批次选择 2–8 件商品组成一个完整展台。这里只影响新品墙，不会进入正式商品、库存、购物车或订单请求。</p>
          <p className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${initialDisplaySet.isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{initialDisplaySet.isFallback ? "当前为系统建议组合，保存后固定到前台" : "当前前台展台已保存"}</p>
        </div>
        <StageMiniPreview featuredItemId={featuredItemId} items={selectedItems} preset={preset} />
      </div>

      <div className="grid gap-7 p-5 lg:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <div>
          <div className="flex items-end justify-between gap-3"><div><h3 className="font-semibold">展台商品与顺序</h3><p className="mt-1 text-sm text-slate-500">已选择 {selectedIds.length}/8 件；箭头用于受控排序。</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {selectedItems.map((item, index) => (
              <article className={`grid grid-cols-[72px_1fr] gap-3 rounded-2xl border p-2 ${item.id === featuredItemId ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`} key={item.id}>
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-100">{item.images[0]?.signedUrl ? <img alt="" className="h-full w-full object-cover" src={item.images[0].signedUrl} /> : null}</div>
                <div className="min-w-0 py-1"><p className="truncate text-sm font-semibold">{item.titleZh || item.shortCode}</p><p className="mt-1 text-xs text-slate-500">位置 {index + 1}{item.id === featuredItemId ? " · 主推" : ""}</p><div className="mt-2 flex flex-wrap gap-1"><button aria-label={`上移 ${item.titleZh || item.shortCode}`} className="min-h-9 rounded-lg border px-2 text-xs disabled:opacity-30" disabled={index === 0} onClick={() => move(item.id, -1)} type="button">↑</button><button aria-label={`下移 ${item.titleZh || item.shortCode}`} className="min-h-9 rounded-lg border px-2 text-xs disabled:opacity-30" disabled={index === selectedItems.length - 1} onClick={() => move(item.id, 1)} type="button">↓</button><button className="min-h-9 rounded-lg border px-2 text-xs" onClick={() => setFeaturedItemId(item.id)} type="button">主推</button><button className="min-h-9 rounded-lg border border-rose-200 px-2 text-xs text-rose-700" onClick={() => toggleItem(item.id)} type="button">移除</button></div></div>
              </article>
            ))}
          </div>
          {selectedItems.length < 2 ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">至少选择 2 件商品，才能形成完整新品展台。</p> : null}
        </div>

        <fieldset>
          <legend className="font-semibold">整组展示效果</legend>
          <div className="mt-4 grid gap-3">
            {presetOptions.map((option) => (
              <label className={`cursor-pointer rounded-2xl border-2 p-4 ${preset === option.value ? "border-[#e2c200] bg-[#fffbea] ring-2 ring-[#f7e653]" : "border-slate-200"}`} key={option.value}>
                <input checked={preset === option.value} className="mr-3" name="displayPreset" onChange={() => setPreset(option.value)} type="radio" value={option.value} />
                <strong>{option.name}</strong><span className="mt-1 block pl-7 text-sm leading-6 text-slate-600">{option.description}</span>
              </label>
            ))}
          </div>
          <button className="mt-4 min-h-12 w-full rounded-xl border border-[#e2c200] bg-[#f7e653] px-5 py-3 font-semibold text-[#292c30] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || selectedIds.length < 2 || selectedIds.length > 8 || !featuredItemId} onClick={save} type="button">{pending ? "正在更新前台…" : "保存并更新前台展台"}</button>
          {message ? <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900" role="status">{message}</p> : null}
        </fieldset>
      </div>

      <div className="border-t border-slate-200 bg-[#fffdf8] p-5 lg:p-6">
        <h3 className="font-semibold">从展示库加入商品</h3>
        <p className="mt-1 text-sm text-slate-500">上传日期不影响组合；已归档商品不会出现在这里。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {eligibleItems.map((item) => {
            const selected = selectedIds.includes(item.id);
            return <button aria-pressed={selected} className={`overflow-hidden rounded-xl border text-left ${selected ? "border-[#e2c200] bg-[#fffbea] ring-2 ring-[#f7e653]" : "border-slate-200 bg-white hover:border-sky-300"}`} key={item.id} onClick={() => toggleItem(item.id)} type="button"><span className="block aspect-[4/3] overflow-hidden bg-slate-100">{item.images[0]?.signedUrl ? <img alt="" className="h-full w-full object-cover" src={item.images[0].signedUrl} /> : null}</span><span className="block truncate px-2 pt-2 text-xs font-semibold">{item.titleZh || item.shortCode}</span><span className="block px-2 pb-2 pt-1 text-xs text-slate-500">{selected ? "✓ 已加入展台" : "＋ 加入展台"}</span></button>;
          })}
        </div>
      </div>
    </section>
  );
}
