import type { AppLocale } from "./config";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

const messagesByLocale = {
  en: enMessages,
  zh: zhMessages,
} satisfies Record<AppLocale, typeof zhMessages>;

export function getMessages(locale: AppLocale) {
  return messagesByLocale[locale];
}
