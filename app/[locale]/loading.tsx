"use client";

import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/i18n/get-messages";

export default function StoreLoading() {
  const locale = usePathname().startsWith("/zh") ? "zh" : "en";
  const messages = getMessages(locale).public.errors;
  return <main className="store-container loading-page" aria-label={messages.loading}><div className="loading-bar" /><div className="loading-grid">{Array.from({ length: 8 }, (_, index) => <div className="loading-card" key={index} />)}</div></main>;
}
