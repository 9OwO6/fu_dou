import type { AppLocale } from "./config";
import zhMessages from "@/messages/zh.json";

const messagesByLocale = {
  zh: zhMessages,
} satisfies Record<AppLocale, typeof zhMessages>;

export function getMessages(locale: AppLocale) {
  return messagesByLocale[locale];
}
