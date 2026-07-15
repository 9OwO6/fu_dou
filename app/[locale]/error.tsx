"use client";

import { usePathname } from "next/navigation";

import { BrandEmptyMark } from "@/components/layout/brand-empty-mark";
import { getMessages } from "@/lib/i18n/get-messages";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = usePathname().startsWith("/zh") ? "zh" : "en";
  const messages = getMessages(locale).public.errors;
  return <main className="store-container error-page"><BrandEmptyMark /><h1>{messages.loadTitle}</h1><p>{messages.loadBody}</p><button className="button-primary" onClick={reset} type="button">{messages.retry}</button></main>;
}
