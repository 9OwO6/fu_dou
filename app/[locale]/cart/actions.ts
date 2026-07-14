"use server";

import { validateCartItems } from "@/lib/cart/server-validation";
import { parseCartValidationInput } from "@/lib/cart/schema";
import { isSupportedLocale } from "@/lib/i18n/config";

export async function revalidateCart(locale: string, input: unknown) {
  if (!isSupportedLocale(locale)) throw new Error("不支持的语言。");
  return validateCartItems(locale, parseCartValidationInput(input));
}
