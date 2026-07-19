import Link from "next/link";

import { ShowcaseManager } from "@/components/admin/showcase-manager";
import { getActiveShowcaseDisplaySet, listAdminShowcaseItems, listShowcaseTags } from "@/lib/showcase/data";

export const metadata = { title: "快速上新管理 | Happy Beans" };

export default async function QuickListingsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [{ notice }, items, tags] = await Promise.all([
    searchParams,
    listAdminShowcaseItems(),
    listShowcaseTags("zh", true),
  ]);
  const displaySet = await getActiveShowcaseDisplaySet(items);
  return (
    <section aria-labelledby="quick-listings-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">快速上新试验</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" id="quick-listings-heading">新品展示管理墙</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">管理轻量展示商品。默认只承诺“请私信确认”，卖完后一键盖上售完状态，不维护精确库存。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold hover:bg-slate-50" href="/zh/new-arrivals" target="_blank">查看新品墙 ↗</Link>
          <Link className="min-h-11 rounded-xl border border-[#e2c200] bg-[#f7e653] px-5 py-3 font-semibold text-[#292c30] shadow-sm hover:bg-[#f3dc2f]" href="/admin/quick-listings/new">＋ 快速发布新品</Link>
        </div>
      </div>
      {notice === "published" ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status">本批新品已发布。你可以在下方把它们加入“当前新品展台”。</p> : null}
      <ShowcaseManager initialDisplaySet={displaySet} initialItems={items} tags={tags} />
    </section>
  );
}
