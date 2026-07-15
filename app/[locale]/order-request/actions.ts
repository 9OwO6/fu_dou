"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { sendOrderRequestEmails } from "@/lib/email/order-request-emails";
import { validateEnvironment } from "@/lib/env/schema";
import { isSupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import { parseOrderRequestForm, type OrderRequestField } from "@/lib/orders/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type SubmitOrderState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<OrderRequestField, string>>;
  requestNumber?: string;
};

function hmac(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function clientAddress(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function submitOrderRequestAction(
  locale: string,
  _previousState: SubmitOrderState,
  formData: FormData,
): Promise<SubmitOrderState> {
  if (!isSupportedLocale(locale)) return { status: "error", message: "Unsupported language.", fieldErrors: {} };
  const messages = getMessages(locale).public.orderRequest;
  const initialError: SubmitOrderState = { status: "error", message: messages.genericError, fieldErrors: {} };
  const parsed = parseOrderRequestForm(formData, locale);

  // Bots receive the same generic success shape without a database write.
  if (parsed.honeypotFilled) {
    return { status: "success", message: messages.botSuccess, fieldErrors: {}, requestNumber: "" };
  }
  if (!parsed.success) {
    return { status: "error", message: messages.fixErrors, fieldErrors: parsed.fieldErrors };
  }

  let securityEnv;
  try {
    securityEnv = validateEnvironment({
      ORDER_RATE_LIMIT_SECRET: process.env.ORDER_RATE_LIMIT_SECRET,
    }, ["ORDER_RATE_LIMIT_SECRET"] as const);
  } catch {
    return initialError;
  }

  try {
    const requestHeaders = await headers();
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("submit_order_request_localized", {
      p_customer_name: parsed.values.customerName,
      p_email: parsed.values.email,
      p_phone: parsed.values.phone || null,
      p_preferred_contact: parsed.values.preferredContact,
      p_fulfillment_method: parsed.values.fulfillmentMethod,
      p_city_or_area: parsed.values.cityOrArea,
      p_postal_code: parsed.values.postalCode || null,
      p_wechat_or_other_contact: parsed.values.wechatOrOtherContact || null,
      p_preferred_time: parsed.values.preferredTime || null,
      p_customer_note: parsed.values.customerNote || null,
      p_items: parsed.values.items,
      p_ip_hash: hmac(clientAddress(requestHeaders), securityEnv.ORDER_RATE_LIMIT_SECRET),
      p_email_hash: hmac(parsed.values.email, securityEnv.ORDER_RATE_LIMIT_SECRET),
      p_request_locale: locale,
    });

    if (error || !data || typeof data !== "object") {
      const databaseMessage = error?.message ?? "";
      const fieldErrors: SubmitOrderState["fieldErrors"] = {};
      if (databaseMessage.includes("insufficient_stock")) fieldErrors.cart = messages.stockServerError;
      if (databaseMessage.includes("item_unavailable")) fieldErrors.cart = messages.unavailableServerError;
      if (databaseMessage.includes("translation_unavailable")) fieldErrors.cart = messages.translationServerError;
      return { ...initialError, fieldErrors };
    }
    const result = data as Record<string, unknown>;
    if (result.ok === false && result.code === "rate_limited") {
      return {
        status: "error",
        message: messages.rateLimited,
        fieldErrors: {},
      };
    }
    if (result.ok !== true || typeof result.orderRequestId !== "string" || typeof result.requestNumber !== "string") {
      return initialError;
    }

    // The transaction has committed before email work begins. This function
    // records failures but never deletes or rolls back the saved request.
    await sendOrderRequestEmails(result.orderRequestId);
    return {
      status: "success",
      message: messages.saved,
      fieldErrors: {},
      requestNumber: result.requestNumber,
    };
  } catch {
    return initialError;
  }
}
