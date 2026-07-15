import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CartPage } from "@/components/cart/cart-page";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const messages = getMessages(locale).public.cart;
  return { title: messages.title, description: messages.intro, robots: { index: false, follow: false } };
}

export default async function CartRoute({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <CartPage locale={locale} messages={getMessages(locale).public.cart} />;
}
