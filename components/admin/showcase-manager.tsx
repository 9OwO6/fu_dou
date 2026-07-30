/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createShowcaseTagAction,
  deleteShowcaseImageAction,
  dissolveShowcaseStyleGroupAction,
  moveShowcaseImageAction,
  saveShowcaseStyleGroupAction,
  updateShowcaseItemAction,
  updateShowcaseItemsStatusAction,
  type ShowcaseActionState,
} from "@/app/admin/(protected)/quick-listings/actions";
import { ShowcaseStageEditor } from "@/components/admin/showcase-stage-editor";
import type { AdminShowcaseItem, ShowcaseDisplaySet, ShowcaseStyleGroup, ShowcaseTag } from "@/lib/showcase/data";
import { uploadAndAddShowcaseImages, uploadAndReplaceShowcaseImage } from "@/lib/showcase/client-upload";
import { MAX_SHOWCASE_IMAGES_PER_ITEM, MAX_SHOWCASE_STYLE_GROUP_ITEMS, MIN_SHOWCASE_STYLE_GROUP_ITEMS } from "@/lib/showcase/validation";

const initialState: ShowcaseActionState = { status: "idle", message: "" };
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

type StyleGroupDraft = {
  groupId: string | null;
  nameZh: string;
  nameEn: string;
  featuredItemId: string;
  members: Array<{ item: AdminShowcaseItem; labelZh: string; labelEn: string }>;
};

function StyleGroupDialog({ draft, onClose, onSaved }: { draft: StyleGroupDraft; onClose: () => void; onSaved: (message: string) => void }) {
  const [value, setValue] = useState(draft);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setPending(true);
    setMessage("");
    const result = await saveShowcaseStyleGroupAction(
      value.groupId,
      value.nameZh,
      value.nameEn,
      value.featuredItemId,
      value.members.map((member, sortOrder) => ({
        itemId: member.item.id,
        labelZh: member.labelZh,
        labelEn: member.labelEn,
        sortOrder,
      })),
    );
    setPending(false);
    if (result.status === "success") onSaved(result.message);
    else setMessage(result.message);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 sm:p-8" role="presentation">
      <section aria-labelledby="style-group-dialog-title" aria-modal="true" className="mx-auto max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">同一商品 · 不同款式</p>
            <h2 className="mt-1 text-2xl font-bold" id="style-group-dialog-title">{value.groupId ? "编辑款式组" : "组成款式组"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">前台会合成一张商品卡；原图片、编号、价格和状态仍各自保留。</p>
          </div>
          <button aria-label="关闭款式组编辑" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl" disabled={pending} onClick={onClose} type="button">×</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">系列中文名称<input autoFocus className={`${inputClass} mt-1`} maxLength={120} onChange={(event) => setValue((current) => ({ ...current, nameZh: event.target.value }))} placeholder="例如：脚丫马克杯" required value={value.nameZh} /></label>
          <label className="text-sm font-semibold">English name（可不填）<input className={`${inputClass} mt-1`} maxLength={120} onChange={(event) => setValue((current) => ({ ...current, nameEn: event.target.value }))} placeholder="Footed Mug" value={value.nameEn} /></label>
          <label className="text-sm font-semibold sm:col-span-2">主展示款<select className={`${inputClass} mt-1`} onChange={(event) => setValue((current) => ({ ...current, featuredItemId: event.target.value }))} value={value.featuredItemId}>{value.members.map((member) => <option key={member.item.id} value={member.item.id}>{member.labelZh || member.item.titleZh || member.item.shortCode}</option>)}</select></label>
        </div>

        <fieldset className="mt-6">
          <legend className="font-semibold">分别填写简短款式名</legend>
          <p className="mt-1 text-sm text-slate-600">例如“微笑”“调皮”；顾客会用这些按钮切换图片和价格。</p>
          <div className="mt-3 grid gap-3">
            {value.members.map((member, index) => (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[88px_1fr_1fr]" key={member.item.id}>
                <img alt="" className="aspect-square w-[88px] rounded-xl object-cover" src={member.item.images[0]?.signedUrl} />
                <label className="text-sm font-semibold">中文款式名<input className={`${inputClass} mt-1`} maxLength={60} onChange={(event) => setValue((current) => ({ ...current, members: current.members.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, labelZh: event.target.value } : candidate) }))} placeholder="微笑" required value={member.labelZh} /></label>
                <label className="text-sm font-semibold">English（可不填）<input className={`${inputClass} mt-1`} maxLength={60} onChange={(event) => setValue((current) => ({ ...current, members: current.members.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, labelEn: event.target.value } : candidate) }))} placeholder="Smiling" value={member.labelEn} /></label>
              </div>
            ))}
          </div>
        </fieldset>

        {message ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">{message}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-semibold" disabled={pending} onClick={onClose} type="button">取消</button>
          <button className="min-h-11 rounded-xl border border-[#e2c200] bg-[#f7e653] px-5 font-semibold disabled:opacity-50" disabled={pending} onClick={() => void save()} type="button">{pending ? "正在保存…" : "保存款式组"}</button>
        </div>
      </section>
    </div>
  );
}

function TagCreator() {
  const [state, action, pending] = useActionState(createShowcaseTagAction, initialState);
  return (
    <details className="rounded-2xl border border-[#e5e0d7] bg-white p-5">
      <summary className="cursor-pointer font-semibold">＋ 新建轻量标签</summary>
      <form action={action} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold">中文名称<input className={`${inputClass} mt-1`} maxLength={60} name="nameZh" placeholder="例如：文具" required /></label>
        <label className="text-sm font-semibold">English name（可不填）<input className={`${inputClass} mt-1`} maxLength={60} name="nameEn" placeholder="Stationery" /></label>
        <label className="text-sm font-semibold">网址标识<input className={`${inputClass} mt-1`} maxLength={60} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="stationery" required /></label>
        <button className="min-h-11 rounded-xl border border-[#e2c200] bg-[#f7e653] px-4 py-2 font-semibold disabled:opacity-50 md:col-start-3" disabled={pending} type="submit">{pending ? "正在创建…" : "创建标签"}</button>
      </form>
      {state.message ? <p className={`mt-3 rounded-xl p-3 text-sm ${state.status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role="status">{state.message}</p> : null}
    </details>
  );
}

function ShowcaseImageEditor({ item }: { item: AdminShowcaseItem }) {
  const router = useRouter();
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<{ id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const remaining = MAX_SHOWCASE_IMAGES_PER_ITEM - item.images.length;

  async function addFiles(files: File[], replacing?: { id: string }) {
    if (!files.length) return;
    if (!replacing && files.length > remaining) {
      setMessage(`每个展示商品最多 ${MAX_SHOWCASE_IMAGES_PER_ITEM} 张图片；当前还可添加 ${remaining} 张。`);
      return;
    }
    setPending(true);
    setMessage(replacing ? "正在上传替换图片…" : `正在上传 ${files.length} 张图片…`);
    let added: ShowcaseActionState;
    try {
      added = replacing
        ? await uploadAndReplaceShowcaseImage(item.id, replacing.id, files[0])
        : await uploadAndAddShowcaseImages(item.id, files);
    } catch {
      setPending(false);
      setMessage("图片处理意外中断，请确认管理员会话与网络后重试。");
      return;
    }
    if (added.status !== "success") {
      setPending(false);
      setMessage(added.message);
      return;
    }

    setMessage(added.message);
    setPending(false);
    router.refresh();
  }

  async function removeImage(imageId: string) {
    if (item.images.length <= 1 || !window.confirm("确定移除这张图片吗？图片文件也会从 Storage 删除。")) return;
    setPending(true);
    setMessage("正在移除图片…");
    const result = await deleteShowcaseImageAction(item.id, imageId);
    setPending(false);
    setMessage(result.message);
    if (result.status === "success") router.refresh();
  }

  async function setCover(imageId: string) {
    setPending(true);
    setMessage("正在更新封面…");
    const result = await moveShowcaseImageAction(item.id, imageId, 0);
    setPending(false);
    setMessage(result.message);
    if (result.status === "success") router.refresh();
  }

  return (
    <section aria-labelledby={`showcase-images-${item.id}`} className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" id={`showcase-images-${item.id}`}>商品图片</h3>
          <p className="mt-1 text-xs text-slate-600">第 1 张是封面；可添加、替换或移除，至少保留 1 张。</p>
        </div>
        <button className="min-h-10 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || remaining < 1} onClick={() => addInput.current?.click()} type="button">
          {remaining > 0 ? `＋ 添加图片（还可 ${remaining} 张）` : "已达 10 张上限"}
        </button>
      </div>

      <input ref={addInput} accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(files); }} type="file" />
      <input ref={replaceInput} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const target = replaceTarget.current; event.target.value = ""; replaceTarget.current = null; if (file && target) void addFiles([file], target); }} type="file" />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {item.images.map((image, index) => (
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={image.id}>
            <div className="relative aspect-[4/3] bg-slate-100">
              <img alt={image.altText} className="h-full w-full object-cover" src={image.signedUrl} />
              <span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">{index === 0 ? "封面" : `第 ${index + 1} 张`}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              {index > 0 ? <button className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs font-semibold disabled:opacity-50" disabled={pending} onClick={() => void setCover(image.id)} type="button">设为封面</button> : <span className="min-h-10 rounded-lg bg-emerald-50 px-2 py-3 text-center text-xs font-semibold text-emerald-700">当前封面</span>}
              <button className="min-h-10 rounded-lg border border-sky-300 px-2 text-xs font-semibold text-sky-800 disabled:opacity-50" disabled={pending} onClick={() => { replaceTarget.current = { id: image.id }; replaceInput.current?.click(); }} type="button">替换</button>
              <button className="col-span-2 min-h-10 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || item.images.length <= 1} onClick={() => void removeImage(image.id)} type="button">{item.images.length <= 1 ? "至少保留 1 张" : "移除图片"}</button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700" role="status">{message}</p> : null}
    </section>
  );
}

function ItemEditor({ item, tags }: { item: AdminShowcaseItem; tags: ShowcaseTag[] }) {
  const [state, action, pending] = useActionState(updateShowcaseItemAction.bind(null, item.id), initialState);
  return (
    <details className="border-t border-slate-100 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-sky-800">编辑图片、名称、说明、价格和标签</summary>
      <ShowcaseImageEditor item={item} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">中文名称<input className={`${inputClass} mt-1`} defaultValue={item.titleZh} maxLength={120} name="titleZh" /></label>
        <label className="text-sm font-semibold">English name<input className={`${inputClass} mt-1`} defaultValue={item.titleEn} maxLength={120} name="titleEn" /></label>
        <label className="text-sm font-semibold sm:col-span-2">价格 CAD<input className={`${inputClass} mt-1`} defaultValue={item.priceCad ?? ""} inputMode="decimal" name="priceCad" /></label>
        <label className="text-sm font-semibold">中文说明<textarea className={`${inputClass} mt-1 min-h-20`} defaultValue={item.descriptionZh} maxLength={500} name="descriptionZh" /></label>
        <label className="text-sm font-semibold">English description<textarea className={`${inputClass} mt-1 min-h-20`} defaultValue={item.descriptionEn} maxLength={500} name="descriptionEn" /></label>
        <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">标签</legend><div className="mt-2 flex flex-wrap gap-2">{tags.map((tag) => <label className="rounded-full border border-slate-200 px-3 py-1.5 text-sm" key={tag.id}><input className="mr-2" defaultChecked={item.tags.some((current) => current.id === tag.id)} name="tagIds" type="checkbox" value={tag.id} />{tag.nameZh || tag.slug}</label>)}</div></fieldset>
        <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50 sm:col-start-2" disabled={pending} type="submit">{pending ? "正在保存…" : "保存可选内容"}</button>
      </form>
      {state.message ? <p className={`mt-3 rounded-xl p-3 text-sm ${state.status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role="status">{state.message}</p> : null}
    </details>
  );
}

export function ShowcaseManager({ initialDisplaySet, initialItems, tags }: { initialDisplaySet: ShowcaseDisplaySet; initialItems: AdminShowcaseItem[]; tags: ShowcaseTag[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [groupDraft, setGroupDraft] = useState<StyleGroupDraft | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const items = useMemo(() => initialItems.filter((item) => {
    if (statusFilter !== "all" && item.availability !== statusFilter) return false;
    const needle = query.trim().toLowerCase();
    return !needle || item.shortCode.toLowerCase().includes(needle) || item.titleZh.toLowerCase().includes(needle) || item.titleEn.toLowerCase().includes(needle);
  }), [initialItems, query, statusFilter]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function updateStatus(availability: "inquiry" | "sold" | "archived", ids = [...selected]) {
    if (!ids.length) {
      setMessage("请先选择至少一个展示商品。 ");
      return;
    }
    setPending(true);
    const result = await updateShowcaseItemsStatusAction(ids, availability);
    setPending(false);
    setMessage(result.message);
    if (result.status === "success") {
      setSelected(new Set());
      router.refresh();
    }
  }

  function openNewStyleGroup(ids = [...selected]) {
    const candidates = ids.map((id) => initialItems.find((item) => item.id === id)).filter((item): item is AdminShowcaseItem => Boolean(item));
    if (candidates.length < MIN_SHOWCASE_STYLE_GROUP_ITEMS || candidates.length > MAX_SHOWCASE_STYLE_GROUP_ITEMS) {
      setMessage(`请选择 ${MIN_SHOWCASE_STYLE_GROUP_ITEMS}–${MAX_SHOWCASE_STYLE_GROUP_ITEMS} 个展示商品组成款式组。`);
      return;
    }
    if (candidates.some((item) => item.availability === "archived")) {
      setMessage("已归档商品不能加入款式组，请先恢复展示。");
      return;
    }
    const existingGroup = candidates.find((item) => item.styleGroup)?.styleGroup;
    if (existingGroup) {
      if (candidates.every((item) => item.styleGroup?.id === existingGroup.id)) openExistingStyleGroup(existingGroup);
      else setMessage("其中一个商品已经属于款式组，请先编辑或拆散原款式组。");
      return;
    }
    setGroupDraft({
      groupId: null,
      nameZh: "",
      nameEn: "",
      featuredItemId: candidates[0].id,
      members: candidates.map((item) => ({ item, labelZh: item.titleZh, labelEn: item.titleEn })),
    });
  }

  function openExistingStyleGroup(group: ShowcaseStyleGroup) {
    const members = group.members.map((member) => {
      const item = initialItems.find((candidate) => candidate.id === member.itemId);
      return item ? { item, labelZh: member.labelZh, labelEn: member.labelEn } : null;
    }).filter((member): member is NonNullable<typeof member> => Boolean(member));
    if (members.length < MIN_SHOWCASE_STYLE_GROUP_ITEMS) {
      setMessage("款式组资料暂时无法完整读取，请刷新页面后重试。");
      return;
    }
    setGroupDraft({ groupId: group.id, nameZh: group.nameZh, nameEn: group.nameEn, featuredItemId: group.featuredItemId, members });
  }

  async function dissolveStyleGroup(group: ShowcaseStyleGroup) {
    if (!window.confirm(`确定拆散“${group.nameZh || group.name}”吗？原商品和图片不会删除。`)) return;
    setPending(true);
    const result = await dissolveShowcaseStyleGroupAction(group.id);
    setPending(false);
    setMessage(result.message);
    if (result.status === "success") {
      setSelected(new Set());
      router.refresh();
    }
  }

  function dropOnItem(targetId: string) {
    const sourceId = draggedItemId;
    setDraggedItemId(null);
    setDragTargetId(null);
    if (!sourceId || sourceId === targetId) return;
    openNewStyleGroup([sourceId, targetId]);
  }

  return (
    <div className="space-y-5">
      <TagCreator />
      {initialItems.some((item) => item.availability !== "archived") ? <ShowcaseStageEditor initialDisplaySet={initialDisplaySet} items={initialItems} /> : null}
      <div className="grid gap-3 rounded-2xl border border-[#e5e0d7] bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <label className="text-sm font-semibold">搜索<input className={`${inputClass} mt-1`} onChange={(event) => setQuery(event.target.value)} placeholder="商品编号或名称" type="search" value={query} /></label>
        <label className="text-sm font-semibold">状态<select className={`${inputClass} mt-1`} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">全部</option><option value="inquiry">请私信确认</option><option value="sold">已售完</option><option value="archived">已归档</option></select></label>
        <button className="min-h-11 self-end rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold" onClick={() => setSelected(new Set(items.map((item) => item.id)))} type="button">选择当前结果</button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#a9dfe8] bg-[#f4fcfd] p-4">
        <span className="mr-2 self-center text-sm font-semibold">已选 {selected.size} 项</span>
        <button className="rounded-xl border border-[#e2c200] bg-[#f7e653] px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={() => openNewStyleGroup()} type="button">组成款式组</button>
        <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={() => void updateStatus("inquiry")} type="button">恢复“请私信确认”</button>
        <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={() => void updateStatus("sold")} type="button">标记已售完</button>
        <button className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50" disabled={pending} onClick={() => void updateStatus("archived")} type="button">归档并隐藏</button>
      </div>

      {message ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900" role="status">{message}</p> : null}

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${dragTargetId === item.id ? "scale-[1.015] border-sky-500 ring-4 ring-sky-200" : selected.has(item.id) ? "border-[#e2c200] ring-2 ring-[#f7e653]" : "border-[#e5e0d7]"}`} key={item.id} onDragEnter={() => draggedItemId && draggedItemId !== item.id && setDragTargetId(item.id)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragTargetId(null); }} onDragOver={(event) => { if (draggedItemId && draggedItemId !== item.id) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); dropOnItem(item.id); }}>
              <label className="absolute z-10 m-3 flex size-10 items-center justify-center rounded-full bg-white/95 shadow"><span className="sr-only">选择 {item.shortCode}</span><input checked={selected.has(item.id)} onChange={() => toggle(item.id)} type="checkbox" /></label>
              <div className="relative aspect-[4/5] bg-slate-100">
                {item.images[0]?.signedUrl ? <img alt={item.images[0].altText} className="h-full w-full object-cover" src={item.images[0].signedUrl} /> : null}
                <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${item.availability === "sold" ? "bg-rose-100 text-rose-800" : item.availability === "archived" ? "bg-slate-200 text-slate-700" : "bg-[#fff7c2] text-[#6d5800]"}`}>{item.availability === "sold" ? "已售完" : item.availability === "archived" ? "已归档" : "请私信确认"}</span>
                {item.images.length > 1 ? <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">{item.images.length} 张</span> : null}
                {item.availability !== "archived" ? <button aria-label={`拖动 ${item.shortCode} 到另一商品组成款式组`} className="absolute bottom-3 left-3 cursor-grab rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-sky-800 shadow active:cursor-grabbing" draggable onDragEnd={() => { setDraggedItemId(null); setDragTargetId(null); }} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedItemId(item.id); }} type="button">↕ 拖动合并</button> : null}
              </div>
              <div className="p-4">
                <p className="font-mono text-xs text-slate-500">{item.shortCode}</p>
                <h2 className="mt-2 text-lg font-semibold">{item.titleZh || "未填写名称"}</h2>
                {item.priceCad ? <p className="mt-2 font-semibold">CA${item.priceCad.toFixed(2)}</p> : <p className="mt-2 text-sm text-slate-500">价格请私信店主</p>}
                {item.styleGroup ? <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm"><p className="font-semibold text-sky-900">款式组：{item.styleGroup.nameZh || item.styleGroup.name}</p><p className="mt-1 text-sky-700">当前款式：{item.styleGroup.members.find((member) => member.itemId === item.id)?.labelZh}</p></div> : null}
                <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.map((tag) => <span className="rounded-full bg-[#eef9fb] px-2.5 py-1 text-xs text-[#155f70]" key={tag.id}>{tag.nameZh || tag.slug}</span>)}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.styleGroup ? <button className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-800" onClick={() => openExistingStyleGroup(item.styleGroup!)} type="button">编辑款式组</button> : null}
                  {item.styleGroup ? <button className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700" disabled={pending} onClick={() => void dissolveStyleGroup(item.styleGroup!)} type="button">拆散</button> : null}
                  {item.availability !== "sold" ? <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={() => void updateStatus("sold", [item.id])} type="button">一键售完</button> : <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={() => void updateStatus("inquiry", [item.id])} type="button">恢复展示</button>}
                  {item.availability !== "archived" ? <button className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => void updateStatus("archived", [item.id])} type="button">归档</button> : null}
                </div>
              </div>
              <ItemEditor item={item} tags={tags} />
            </article>
          ))}
        </div>
      ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">没有符合条件的展示商品</h2><p className="mt-2 text-slate-500">调整搜索与状态筛选，或发布一批新品。</p></div>}
      {groupDraft ? <StyleGroupDialog draft={groupDraft} onClose={() => setGroupDraft(null)} onSaved={(nextMessage) => { setGroupDraft(null); setMessage(nextMessage); setSelected(new Set()); router.refresh(); }} /> : null}
    </div>
  );
}
