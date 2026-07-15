import Link from "next/link";

import { listAdminOrders, orderStatusLabels, orderStatuses } from "@/lib/orders/admin-data";

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[] }>;
const cad = new Intl.NumberFormat("zh-CA", { style: "currency", currency: "CAD" });

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const status = typeof query.status === "string" ? query.status : "";
  const orders = await listAdminOrders({ query: q, status });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-sky-700">Phase 8</p>
        <h1 className="mt-1 text-3xl font-bold">订单请求</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">这些请求均未付款、未最终确认。请联系顾客后按状态顺序处理。</p>
      </header>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px_auto]" method="get">
        <label className="grid gap-1 text-sm font-semibold">搜索
          <input className="min-h-11 rounded-xl border border-slate-300 px-3 font-normal" defaultValue={q} name="q" placeholder="请求编号、姓名或邮箱" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">状态
          <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" defaultValue={status} name="status">
            <option value="">全部状态</option>
            {orderStatuses.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-xl bg-sky-700 px-5 text-sm font-semibold text-white" type="submit">应用筛选</button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="text-lg font-semibold">没有符合条件的订单请求</h2><p className="mt-2 text-sm text-slate-600">新请求入库后会显示在这里。</p></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">请求</th><th className="px-5 py-3">顾客</th><th className="px-5 py-3">履约</th><th className="px-5 py-3">商品小计</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">提交时间</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-4"><Link className="font-semibold text-sky-800 underline underline-offset-4" href={`/admin/orders/${order.id}`}>{order.requestNumber}</Link><span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{order.requestLocale === "en" ? "English" : "中文"}</span></td>
                    <td className="px-5 py-4"><strong className="block">{order.customerName}</strong><span className="text-slate-500">{order.email}</span></td>
                    <td className="px-5 py-4">{order.fulfillmentMethod === "pickup" ? "自取" : "本地配送"}</td>
                    <td className="px-5 py-4 font-semibold tabular-nums">{cad.format(order.subtotal)}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-800">{orderStatusLabels[order.status]}</span></td>
                    <td className="px-5 py-4 text-slate-600">{new Date(order.createdAt).toLocaleString("zh-CA", { timeZone: "America/Vancouver" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
