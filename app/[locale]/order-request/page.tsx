import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderRequestForm } from "@/components/order-request/order-request-form";
import { isSupportedLocale } from "@/lib/i18n/config";

type Params = Promise<{ locale: string }>;

export const metadata: Metadata = {
  title: "提交订单请求",
  description: "向 Happy Beans 提交未付款、待店主确认的订单请求。",
  robots: { index: false, follow: false },
};

export default async function OrderRequestPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return (
    <main className="order-page">
      <div className="store-container order-page-container">
        <header className="order-heading">
          <p className="cart-kicker">Happy Beans / 福豆</p>
          <h1>提交订单请求</h1>
          <p>填写必要联系与履约信息。我们不会在这里收集完整街道地址，也不会要求在线付款。</p>
        </header>
        <OrderRequestForm locale={locale} />
      </div>
    </main>
  );
}
