import Link from "next/link";

import { ProductActions } from "@/components/admin/product-actions";
import { listAdminProducts } from "@/lib/catalog/admin-data";

export const metadata = { title: "商品管理 | Happy Beans" };

const statusLabels = { draft: "草稿", published: "已发布", archived: "已归档" } as const;
const statusStyles = {
  draft: "bg-amber-50 text-amber-800",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
} as const;

const notices: Record<string, string> = {
  status_draft: "商品已下架并恢复为草稿。",
  status_published: "商品已发布。",
  status_archived: "商品已归档，历史数据仍然保留。",
  action_failed: "操作未完成，请重试。",
  deleted: "商品及其关联数据已永久删除。",
  deleted_storage_warning: "商品数据库记录已删除，但部分图片文件清理失败。请停止重复操作并联系技术人员检查 Storage。",
  delete_requires_unpublish: "已发布商品不能直接删除，请先下架再删除。",
  delete_order_referenced: "该商品已被订单请求引用，不能永久删除；请改用归档。",
  delete_failed: "商品删除失败，请刷新后重试。",
};

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = value(params.q);
  const status = value(params.status);
  const noticeKey = value(params.notice);
  const notice = notices[noticeKey];
  const isErrorNotice = ["action_failed", "delete_failed", "delete_requires_unpublish", "delete_order_referenced", "deleted_storage_warning"].includes(noticeKey);
  const products = await listAdminProducts({ query, status });

  return (
    <section aria-labelledby="products-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">Phase 5A</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" id="products-heading">商品管理</h1>
          <p className="mt-2 text-slate-600">管理商品基础中文内容、SEO 和发布状态。</p>
        </div>
        <Link className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" href="/admin/products/new">
          新建商品
        </Link>
      </div>

      {notice ? <p className={isErrorNotice ? "rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800" : "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"} role={isErrorNotice ? "alert" : "status"}>{notice}</p> : null}

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]" method="get">
        <label className="font-medium" htmlFor="product-search">
          搜索
          <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" defaultValue={query} id="product-search" name="q" placeholder="搜索标题或网址标识" type="search" />
        </label>
        <label className="font-medium" htmlFor="product-status">
          状态
          <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" defaultValue={status} id="product-status" name="status">
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="archived">已归档</option>
          </select>
        </label>
        <button className="self-end rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" type="submit">筛选</button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">没有符合条件的商品</h2>
          <p className="mt-2 text-slate-500">调整搜索或状态筛选，或者创建一个新商品草稿。</p>
          <Link className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white" href="/admin/products/new">新建商品</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[800px] w-full border-collapse text-left">
            <caption className="sr-only">后台商品列表，共 {products.length} 项</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
              <tr><th className="px-4 py-3 font-semibold">商品</th><th className="px-4 py-3 font-semibold">状态</th><th className="px-4 py-3 font-semibold">更新时间</th><th className="px-4 py-3 text-right font-semibold">操作</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4"><Link className="font-semibold text-sky-800 underline-offset-4 hover:underline" href={`/admin/products/${product.id}`}>{product.title}</Link><p className="mt-1 font-mono text-xs text-slate-500">/{product.slug}</p></td>
                  <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[product.status]}`}>{statusLabels[product.status]}</span></td>
                  <td className="px-4 py-4 text-sm text-slate-600"><time dateTime={product.updatedAt}>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Vancouver" }).format(new Date(product.updatedAt))}</time></td>
                  <td className="px-4 py-4"><ProductActions compact product={product} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
