import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY } from "@/lib/cart/schema";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OrderRequestField =
  | "customerName"
  | "email"
  | "phone"
  | "preferredContact"
  | "fulfillmentMethod"
  | "cityOrArea"
  | "postalCode"
  | "wechatOrOtherContact"
  | "preferredTime"
  | "customerNote"
  | "consent"
  | "cart";

export type OrderRequestInput = {
  customerName: string;
  email: string;
  phone: string;
  preferredContact: "email" | "phone";
  fulfillmentMethod: "pickup" | "local_delivery";
  cityOrArea: string;
  postalCode: string;
  wechatOrOtherContact: string;
  preferredTime: string;
  customerNote: string;
  items: { variant_id: string; quantity: number }[];
};

export type OrderRequestParseResult =
  | { success: true; values: OrderRequestInput; honeypotFilled: boolean }
  | { success: false; fieldErrors: Partial<Record<OrderRequestField, string>>; honeypotFilled: boolean };

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseItems(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_CART_ITEMS) return null;
    const seen = new Set<string>();
    const items: OrderRequestInput["items"] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") return null;
      const record = candidate as Record<string, unknown>;
      if (
        typeof record.variantId !== "string"
        || !UUID_PATTERN.test(record.variantId)
        || seen.has(record.variantId)
        || !Number.isInteger(record.quantity)
        || Number(record.quantity) < 1
        || Number(record.quantity) > MAX_ITEM_QUANTITY
      ) return null;
      seen.add(record.variantId);
      items.push({ variant_id: record.variantId, quantity: Number(record.quantity) });
    }
    return items;
  } catch {
    return null;
  }
}

export function parseOrderRequestForm(formData: FormData, locale: AppLocale = "zh"): OrderRequestParseResult {
  const messages = getMessages(locale).public.orderRequest;
  const customerName = stringValue(formData, "customerName");
  const email = stringValue(formData, "email").toLowerCase();
  const phone = stringValue(formData, "phone");
  const preferredContact = stringValue(formData, "preferredContact");
  const fulfillmentMethod = stringValue(formData, "fulfillmentMethod");
  const cityOrArea = stringValue(formData, "cityOrArea");
  const postalCode = stringValue(formData, "postalCode").toUpperCase();
  const wechatOrOtherContact = stringValue(formData, "wechatOrOtherContact");
  const preferredTime = stringValue(formData, "preferredTime");
  const customerNote = stringValue(formData, "customerNote");
  const items = parseItems(stringValue(formData, "cartItems"));
  const honeypotFilled = stringValue(formData, "companyWebsite").length > 0;
  const fieldErrors: Partial<Record<OrderRequestField, string>> = {};

  if (customerName.length < 1 || customerName.length > 120) fieldErrors.customerName = messages.nameError;
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) fieldErrors.email = messages.emailError;
  if (preferredContact !== "email" && preferredContact !== "phone") fieldErrors.preferredContact = messages.contactError;
  if (preferredContact === "phone" && !phone) fieldErrors.phone = messages.phoneRequiredError;
  if (phone.length > 40) fieldErrors.phone = messages.phoneLengthError;
  if (fulfillmentMethod !== "pickup" && fulfillmentMethod !== "local_delivery") fieldErrors.fulfillmentMethod = messages.fulfillmentError;
  if (cityOrArea.length < 1 || cityOrArea.length > 120) fieldErrors.cityOrArea = messages.cityError;
  if (fulfillmentMethod === "local_delivery" && !postalCode) fieldErrors.postalCode = messages.postalRequiredError;
  if (postalCode.length > 20) fieldErrors.postalCode = messages.postalLengthError;
  if (wechatOrOtherContact.length > 120) fieldErrors.wechatOrOtherContact = messages.otherContactError;
  if (preferredTime.length > 200) fieldErrors.preferredTime = messages.timeError;
  if (customerNote.length > 2000) fieldErrors.customerNote = messages.noteError;
  if (formData.get("consent") !== "on") fieldErrors.consent = messages.consentError;
  if (!items) fieldErrors.cart = messages.cartError;

  if (Object.keys(fieldErrors).length > 0 || !items) {
    return { success: false, fieldErrors, honeypotFilled };
  }

  return {
    success: true,
    honeypotFilled,
    values: {
      customerName,
      email,
      phone,
      preferredContact: preferredContact as OrderRequestInput["preferredContact"],
      fulfillmentMethod: fulfillmentMethod as OrderRequestInput["fulfillmentMethod"],
      cityOrArea,
      postalCode,
      wechatOrOtherContact,
      preferredTime,
      customerNote,
      items,
    },
  };
}
