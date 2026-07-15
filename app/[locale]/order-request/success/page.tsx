import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ request?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  return { title: getMessages(locale).public.orderRequest.successTitle, robots: { index: false, follow: false } };
}

export default async function OrderRequestSuccessPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const messages = getMessages(locale).public.orderRequest;
  const query = await searchParams;
  const requestNumber = typeof query.request === "string" && /^HB-[A-F0-9]{20}$/.test(query.request)
    ? query.request
    : null;

  return (
    <main className="order-success-page">
      <section className="order-success-card">
        <div className="success-mark" aria-hidden="true">✓</div>
        <p className="cart-kicker">{messages.successKicker}</p>
        <h1>{messages.successHeading}</h1>
        {requestNumber ? <p className="request-number"><span>{messages.requestNumber}</span><strong>{requestNumber}</strong></p> : null}
        <div className="unpaid-notice">
          <strong>{messages.successNotice}</strong>
          <p>{messages.successBody}</p>
        </div>
        <div className="success-actions">
          <Link className="button-primary" href={`/${locale}/products`}>{messages.continueShopping}</Link>
          <Link className="button-secondary" href={`/${locale}`}>{messages.backHome}</Link>
        </div>
      </section>
    </main>
  );
}
