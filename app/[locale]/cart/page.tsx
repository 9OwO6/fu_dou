import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CartPage } from "@/components/cart/cart-page";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

type Params = Promise<{ locale: string }>;

export const metadata: Metadata = {
  title: "购物车",
  description: "查看和调整 Happy Beans 福豆游客购物车。",
  robots: { index: false, follow: false },
};

export default async function CartRoute({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <CartPage locale={locale} messages={getMessages(locale).public.cart} />;
}
