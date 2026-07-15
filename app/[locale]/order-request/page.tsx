import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderRequestForm } from "@/components/order-request/order-request-form";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const messages = getMessages(locale).public.orderRequest;
  return { title: messages.pageTitle, description: messages.pageDescription, robots: { index: false, follow: false } };
}

export default async function OrderRequestPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const messages = getMessages(locale).public.orderRequest;
  return (
    <main className="order-page">
      <div className="store-container order-page-container">
        <header className="order-heading">
          <p className="cart-kicker">Happy Beans{locale === "zh" ? " / 福豆" : ""}</p>
          <h1>{messages.pageTitle}</h1>
          <p>{messages.pageIntro}</p>
        </header>
        <OrderRequestForm locale={locale} />
      </div>
    </main>
  );
}
