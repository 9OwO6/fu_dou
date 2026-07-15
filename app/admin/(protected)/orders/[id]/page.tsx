import Link from "next/link";
import { notFound } from "next/navigation";

import { retryOrderEmailAction } from "../actions";
import { OrderRequestEditor } from "@/components/admin/order-request-editor";
import { getAdminOrder, orderStatusLabels } from "@/lib/orders/admin-data";

type Params = Promise<{ id: string }>;
const cad = new Intl.NumberFormat("zh-CA", { style: "currency", currency: "CAD" });
const emailKindLabels = { owner_notification: "店主通知邮件", customer_confirmation: "顾客确认邮件" };
const emailStatusLabels = { pending: "待发送", sending: "发送中", sent: "已发送", failed: "发送失败" };

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Link className="text-sm font-semibold text-sky-800 underline underline-offset-4" href="/admin/orders">← 返回订单请求</Link><h1 className="mt-3 text-3xl font-bold">{order.requestNumber}</h1><p className="mt-2 text-sm text-slate-600">顾客语言：{order.requestLocale === "en" ? "English" : "中文"} · 提交于 {new Date(order.createdAt).toLocaleString("zh-CA", { timeZone: "America/Vancouver" })}</p></div>
        <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-900">{orderStatusLabels[order.status]}</span>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>未付款、未最终确认。</strong> 后台小计是提交时的商品快照；税费、配送费和最终金额仍需与顾客确认。</div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">商品快照</h2><div className="mt-4 divide-y divide-slate-200">{order.items.map((item) => <article className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]" key={item.id}><div><h3 className="font-semibold">{item.productTitle}</h3><p className="mt-1 text-sm text-slate-600">{item.variantLabel}</p><p className="mt-1 text-xs text-slate-500">SKU：{item.sku}</p></div><dl className="grid grid-cols-2 gap-x-6 text-sm sm:text-right"><div><dt className="text-slate-500">数量与单价</dt><dd className="mt-1 font-semibold">{item.quantity} × {cad.format(item.unitPrice)}</dd></div><div><dt className="text-slate-500">行小计</dt><dd className="mt-1 font-semibold">{cad.format(item.lineTotal)}</dd></div></dl></article>)}</div><div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-semibold"><span>商品小计</span><span>{cad.format(order.subtotal)}</span></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">顾客与履约</h2><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-slate-500">姓名</dt><dd className="mt-1 font-semibold">{order.customerName}</dd></div><div><dt className="text-slate-500">邮箱</dt><dd className="mt-1 break-all">{order.email}</dd></div><div><dt className="text-slate-500">电话</dt><dd className="mt-1">{order.phone ?? "未提供"}</dd></div><div><dt className="text-slate-500">偏好联系</dt><dd className="mt-1">{order.preferredContact === "phone" ? "电话" : "邮箱"}</dd></div><div><dt className="text-slate-500">履约方式</dt><dd className="mt-1">{order.fulfillmentMethod === "pickup" ? "自取" : "本地配送"}</dd></div><div><dt className="text-slate-500">城市/区域与邮编</dt><dd className="mt-1">{order.cityOrArea}{order.postalCode ? ` · ${order.postalCode}` : ""}</dd></div><div><dt className="text-slate-500">其他联系</dt><dd className="mt-1 whitespace-pre-wrap">{order.wechatOrOtherContact ?? "未提供"}</dd></div><div><dt className="text-slate-500">期望时间</dt><dd className="mt-1 whitespace-pre-wrap">{order.preferredTime ?? "未提供"}</dd></div><div><dt className="text-slate-500">顾客备注</dt><dd className="mt-1 whitespace-pre-wrap">{order.customerNote ?? "无"}</dd></div></dl></section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">邮件状态</h2><p className="mt-2 text-sm text-slate-600">邮件失败不会影响已保存的订单请求。配置修复后可在这里重试。</p><div className="mt-4 grid gap-4 md:grid-cols-2">{order.emails.map((email) => <article className="rounded-xl border border-slate-200 p-4" key={email.id}><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{emailKindLabels[email.kind]}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${email.status === "sent" ? "bg-emerald-50 text-emerald-800" : email.status === "failed" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>{emailStatusLabels[email.status]}</span></div><p className="mt-3 text-sm text-slate-600">尝试次数：{email.attemptCount}{email.sentAt ? ` · 发送于 ${new Date(email.sentAt).toLocaleString("zh-CA", { timeZone: "America/Vancouver" })}` : ""}</p>{email.failureSummary ? <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{email.failureSummary}</p> : null}{email.status !== "sent" ? <form action={retryOrderEmailAction} className="mt-4"><input name="orderRequestId" type="hidden" value={order.id} /><input name="kind" type="hidden" value={email.kind} /><button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" type="submit">重试发送</button></form> : null}</article>)}</div></section>

      <OrderRequestEditor adminNote={order.adminNote} orderId={order.id} status={order.status} />
    </div>
  );
}
