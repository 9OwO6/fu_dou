"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandEmptyMark } from "@/components/layout/brand-empty-mark";
import { getMessages } from "@/lib/i18n/get-messages";

export default function StoreNotFound() {
  const locale = usePathname().startsWith("/zh") ? "zh" : "en";
  const messages = getMessages(locale).public.errors;
  return <main className="store-container error-page"><BrandEmptyMark /><h1>{messages.notFoundTitle}</h1><p>{messages.notFoundBody}</p><Link className="button-primary" href={`/${locale}/products`}>{messages.notFoundCta}</Link></main>;
}
