"use client";

import zhMessages from "@/messages/zh.json";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const messages = zhMessages.public.errors;
  return <main className="store-container error-page"><span aria-hidden="true" className="empty-bean">豆</span><h1>{messages.loadTitle}</h1><p>{messages.loadBody}</p><button className="button-primary" onClick={reset} type="button">{messages.retry}</button></main>;
}
