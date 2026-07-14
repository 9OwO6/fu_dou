"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { sendOrderRequestEmails } from "@/lib/email/order-request-emails";
import { validateEnvironment } from "@/lib/env/schema";
import { isSupportedLocale } from "@/lib/i18n/config";
import { parseOrderRequestForm, type OrderRequestField } from "@/lib/orders/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type SubmitOrderState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<OrderRequestField, string>>;
  requestNumber?: string;
};

const initialError: SubmitOrderState = {
  status: "error",
  message: "订单请求暂时无法提交，请稍后重试。购物车内容仍保留在本设备。",
  fieldErrors: {},
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
  if (!isSupportedLocale(locale)) return initialError;
  const parsed = parseOrderRequestForm(formData);

  // Bots receive the same generic success shape without a database write.
  if (parsed.honeypotFilled) {
    return { status: "success", message: "订单请求已收到。", fieldErrors: {}, requestNumber: "" };
  }
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
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
    const { data, error } = await supabase.rpc("submit_order_request", {
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
    });

    if (error || !data || typeof data !== "object") {
      const databaseMessage = error?.message ?? "";
      const fieldErrors: SubmitOrderState["fieldErrors"] = {};
      if (databaseMessage.includes("insufficient_stock")) fieldErrors.cart = "部分商品库存不足，请返回购物车重新确认。";
      if (databaseMessage.includes("item_unavailable")) fieldErrors.cart = "部分商品已下架、禁用或不可购买，请返回购物车重新确认。";
      return { ...initialError, fieldErrors };
    }
    const result = data as Record<string, unknown>;
    if (result.ok === false && result.code === "rate_limited") {
      return {
        status: "error",
        message: "提交次数较多，请一小时后再试。如需帮助，请直接联系 Happy Beans。",
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
      message: "订单请求已保存。",
      fieldErrors: {},
      requestNumber: result.requestNumber,
    };
  } catch {
    return initialError;
  }
}
