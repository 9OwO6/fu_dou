import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n/config";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ request?: string | string[] }>;

export const metadata: Metadata = {
  title: "订单请求已收到",
  robots: { index: false, follow: false },
};

export default async function OrderRequestSuccessPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const query = await searchParams;
  const requestNumber = typeof query.request === "string" && /^HB-[A-F0-9]{20}$/.test(query.request)
    ? query.request
    : null;

  return (
    <main className="order-success-page">
      <section className="order-success-card">
        <div className="success-mark" aria-hidden="true">✓</div>
        <p className="cart-kicker">订单请求已安全保存</p>
        <h1>谢谢你，我们已经收到请求</h1>
        {requestNumber ? <p className="request-number"><span>请求编号</span><strong>{requestNumber}</strong></p> : null}
        <div className="unpaid-notice">
          <strong>此请求尚未付款，也尚未最终确认。</strong>
          <p>Happy Beans 会按你选择的联系方式核对库存、自取或配送安排、税费及最终金额。请保留上方请求编号。</p>
        </div>
        <div className="success-actions">
          <Link className="button-primary" href={`/${locale}/products`}>继续逛逛</Link>
          <Link className="button-secondary" href={`/${locale}`}>返回首页</Link>
        </div>
      </section>
    </main>
  );
}
