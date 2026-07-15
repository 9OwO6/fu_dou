import "server-only";

import { Resend } from "resend";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

type EmailKind = "owner_notification" | "customer_confirmation";

type OrderEmailRow = {
  id: string;
  kind: EmailKind;
  status: "pending" | "sending" | "sent" | "failed";
  attempt_count: number;
};

type OrderItemRow = {
  product_title_snapshot: string;
  variant_label_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total_snapshot: number;
};

type OrderRow = {
  id: string;
  request_number: string;
  request_locale: "en" | "zh";
  customer_name: string;
  email: string;
  phone: string | null;
  preferred_contact: "email" | "phone";
  fulfillment_method: "pickup" | "local_delivery";
  city_or_area: string;
  postal_code: string | null;
  wechat_or_other_contact: string | null;
  preferred_time: string | null;
  customer_note: string | null;
  subtotal_snapshot: number;
  created_at: string;
  order_request_items: OrderItemRow[];
  order_request_emails: OrderEmailRow[];
};

function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDER_EMAIL_FROM?.trim();
  const owner = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return apiKey && from && owner && siteUrl ? { apiKey, from, owner, siteUrl } : null;
}

function itemLines(items: OrderItemRow[], locale: "en" | "zh") {
  const cad = new Intl.NumberFormat(locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" });
  return items.map((item) =>
    `- ${item.product_title_snapshot}｜${item.variant_label_snapshot}｜SKU ${item.sku_snapshot}｜${item.quantity} × ${cad.format(Number(item.unit_price_snapshot))} = ${cad.format(Number(item.line_total_snapshot))}`,
  ).join("\n");
}

function ownerText(order: OrderRow, adminUrl: string) {
  const cad = new Intl.NumberFormat("zh-CA", { style: "currency", currency: "CAD" });
  return [
    `Happy Beans 收到新的订单请求：${order.request_number}`,
    "",
    "重要：此请求尚未付款，也尚未最终确认。请先联系顾客核对库存、履约、税费及最终金额。",
    "",
    `提交时间：${new Date(order.created_at).toLocaleString("zh-CA", { timeZone: "America/Vancouver" })}`,
    `顾客浏览语言：${order.request_locale === "en" ? "English" : "中文"}`,
    `顾客：${order.customer_name}`,
    `邮箱：${order.email}`,
    `电话：${order.phone ?? "未提供"}`,
    `偏好联系：${order.preferred_contact === "phone" ? "电话" : "邮箱"}`,
    `履约方式：${order.fulfillment_method === "pickup" ? "自取" : "本地配送"}`,
    `城市/区域：${order.city_or_area}`,
    `邮编：${order.postal_code ?? "未提供"}`,
    `其他联系：${order.wechat_or_other_contact ?? "未提供"}`,
    `期望时间：${order.preferred_time ?? "未提供"}`,
    `顾客备注：${order.customer_note ?? "无"}`,
    "",
    itemLines(order.order_request_items, order.request_locale),
    `商品小计：${cad.format(Number(order.subtotal_snapshot))}`,
    "运费、税费及最终金额待联系确认。",
    "",
    `后台详情：${adminUrl}`,
  ].join("\n");
}

function customerText(order: OrderRow, contactEmail: string) {
  const cad = new Intl.NumberFormat(order.request_locale === "en" ? "en-CA" : "zh-CA", { style: "currency", currency: "CAD" });
  if (order.request_locale === "en") {
    return [
      `Hello ${order.customer_name},`,
      "",
      `We received your order request. Request number: ${order.request_number}`,
      "",
      "This is not a payment receipt. You have not paid, and the order is not finally confirmed. Happy Beans will contact you to confirm stock, pickup or delivery, taxes, and the final total.",
      "",
      itemLines(order.order_request_items, "en"),
      `Merchandise subtotal: ${cad.format(Number(order.subtotal_snapshot))}`,
      "Delivery fees, taxes, and the final total are still to be confirmed.",
      "",
      `To add information, contact: ${contactEmail}`,
    ].join("\n");
  }
  return [
    `${order.customer_name}，您好！`,
    "",
    `我们已收到您的订单请求，编号：${order.request_number}`,
    "",
    "这不是付款成功通知。您尚未付款，订单也尚未最终确认。Happy Beans 会按您选择的联系方式核对库存、自取或配送安排、税费及最终金额。",
    "",
    itemLines(order.order_request_items, "zh"),
    `商品小计：${cad.format(Number(order.subtotal_snapshot))}`,
    "运费、税费及最终金额待确认。",
    "",
    `如需补充信息，请联系：${contactEmail}`,
  ].join("\n");
}

function failureSummary(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "EmailError";
    const message = typeof record.message === "string" ? record.message : "邮件服务返回失败。";
    return `${name}: ${message}`.replace(/[\r\n\t]+/g, " ").slice(0, 300);
  }
  return "EmailError: 邮件服务返回失败。";
}

async function markFailed(email: OrderEmailRow, summary: string) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("order_request_emails").update({
    status: "failed",
    attempt_count: email.attempt_count + 1,
    last_attempt_at: new Date().toISOString(),
    failure_summary: summary.slice(0, 300),
    sent_at: null,
    provider_message_id: null,
  }).eq("id", email.id);
}

async function sendOne(order: OrderRow, email: OrderEmailRow) {
  if (email.status === "sent") return;
  const config = emailConfiguration();
  if (!config) {
    await markFailed(email, "EmailConfigurationError: 邮件服务环境变量尚未完整配置。");
    return;
  }

  const supabase = createSupabaseServiceClient();
  const attemptedAt = new Date().toISOString();
  await supabase.from("order_request_emails").update({
    status: "sending",
    attempt_count: email.attempt_count + 1,
    last_attempt_at: attemptedAt,
    failure_summary: null,
    sent_at: null,
    provider_message_id: null,
  }).eq("id", email.id).neq("status", "sent");

  try {
    const resend = new Resend(config.apiKey);
    const isOwner = email.kind === "owner_notification";
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: [isOwner ? config.owner : order.email],
      subject: isOwner
        ? `新订单请求 ${order.request_number}（未付款、待确认）`
        : order.request_locale === "en"
          ? `Order request received ${order.request_number} (unpaid, pending confirmation)`
          : `已收到订单请求 ${order.request_number}（未付款、待确认）`,
      text: isOwner
        ? ownerText(order, `${config.siteUrl.replace(/\/$/, "")}/admin/orders/${order.id}`)
        : customerText(order, config.owner),
      ...(isOwner ? { replyTo: order.email } : { replyTo: config.owner }),
    }, { idempotencyKey: `happy-beans/${order.id}/${email.kind}` });

    if (error || !data?.id) {
      await markFailed({ ...email, attempt_count: email.attempt_count }, failureSummary(error));
      return;
    }
    await supabase.from("order_request_emails").update({
      status: "sent",
      attempt_count: email.attempt_count + 1,
      last_attempt_at: attemptedAt,
      sent_at: new Date().toISOString(),
      provider_message_id: data.id,
      failure_summary: null,
    }).eq("id", email.id);
  } catch (error) {
    await markFailed({ ...email, attempt_count: email.attempt_count }, failureSummary(error));
  }
}

export async function sendOrderRequestEmails(orderRequestId: string, onlyKind?: EmailKind) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("order_requests")
    .select("id, request_number, request_locale, customer_name, email, phone, preferred_contact, fulfillment_method, city_or_area, postal_code, wechat_or_other_contact, preferred_time, customer_note, subtotal_snapshot, created_at, order_request_items(product_title_snapshot, variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total_snapshot), order_request_emails(id, kind, status, attempt_count)")
    .eq("id", orderRequestId)
    .single();
  if (error || !data) return;
  const order = data as unknown as OrderRow;
  const emails = onlyKind
    ? order.order_request_emails.filter((email) => email.kind === onlyKind)
    : order.order_request_emails;
  for (const email of emails) await sendOne(order, email);
}
