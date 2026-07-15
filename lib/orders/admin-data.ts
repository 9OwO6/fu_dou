import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrderStatus, type OrderStatus } from "./status";

export { orderStatusLabels, orderStatuses } from "./status";
export type { OrderStatus } from "./status";

export type AdminOrderSummary = {
  id: string;
  requestNumber: string;
  requestLocale: "en" | "zh";
  status: OrderStatus;
  customerName: string;
  email: string;
  fulfillmentMethod: "pickup" | "local_delivery";
  subtotal: number;
  createdAt: string;
};

export type AdminOrderItem = {
  id: string;
  productTitle: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrderEmail = {
  id: string;
  kind: "owner_notification" | "customer_confirmation";
  status: "pending" | "sending" | "sent" | "failed";
  attemptCount: number;
  failureSummary: string | null;
  lastAttemptAt: string | null;
  sentAt: string | null;
};

export type AdminOrderDetail = AdminOrderSummary & {
  phone: string | null;
  preferredContact: "email" | "phone";
  cityOrArea: string;
  postalCode: string | null;
  wechatOrOtherContact: string | null;
  preferredTime: string | null;
  customerNote: string | null;
  adminNote: string | null;
  updatedAt: string;
  items: AdminOrderItem[];
  emails: AdminOrderEmail[];
};

export async function listAdminOrders(filters: { query: string; status: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("order_requests")
    .select("id, request_number, request_locale, status, customer_name, email, fulfillment_method, subtotal_snapshot, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("订单请求列表暂时无法加载。");

  const query = filters.query.trim().toLocaleLowerCase("zh-CN");
  return (data ?? []).map((row): AdminOrderSummary => ({
    id: row.id,
    requestNumber: row.request_number,
    requestLocale: row.request_locale,
    status: row.status as OrderStatus,
    customerName: row.customer_name,
    email: row.email,
    fulfillmentMethod: row.fulfillment_method,
    subtotal: Number(row.subtotal_snapshot),
    createdAt: row.created_at,
  })).filter((order) => {
    const statusMatches = !isOrderStatus(filters.status) || order.status === filters.status;
    const queryMatches = !query
      || order.requestNumber.toLowerCase().includes(query)
      || order.customerName.toLocaleLowerCase("zh-CN").includes(query)
      || order.email.toLowerCase().includes(query);
    return statusMatches && queryMatches;
  });
}

export async function getAdminOrder(orderRequestId: string): Promise<AdminOrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("order_requests")
    .select("id, request_number, request_locale, status, customer_name, email, phone, preferred_contact, fulfillment_method, city_or_area, postal_code, wechat_or_other_contact, preferred_time, customer_note, admin_note, subtotal_snapshot, created_at, updated_at, order_request_items(id, product_title_snapshot, variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total_snapshot), order_request_emails(id, kind, status, attempt_count, failure_summary, last_attempt_at, sent_at)")
    .eq("id", orderRequestId)
    .maybeSingle();
  if (error) throw new Error("订单请求详情暂时无法加载。");
  if (!data) return null;

  return {
    id: data.id,
    requestNumber: data.request_number,
    requestLocale: data.request_locale,
    status: data.status as OrderStatus,
    customerName: data.customer_name,
    email: data.email,
    phone: data.phone,
    preferredContact: data.preferred_contact,
    fulfillmentMethod: data.fulfillment_method,
    cityOrArea: data.city_or_area,
    postalCode: data.postal_code,
    wechatOrOtherContact: data.wechat_or_other_contact,
    preferredTime: data.preferred_time,
    customerNote: data.customer_note,
    adminNote: data.admin_note,
    subtotal: Number(data.subtotal_snapshot),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    items: (data.order_request_items ?? []).map((item) => ({
      id: item.id,
      productTitle: item.product_title_snapshot,
      variantLabel: item.variant_label_snapshot,
      sku: item.sku_snapshot,
      unitPrice: Number(item.unit_price_snapshot),
      quantity: item.quantity,
      lineTotal: Number(item.line_total_snapshot),
    })),
    emails: (data.order_request_emails ?? []).map((email) => ({
      id: email.id,
      kind: email.kind,
      status: email.status,
      attemptCount: email.attempt_count,
      failureSummary: email.failure_summary,
      lastAttemptAt: email.last_attempt_at,
      sentAt: email.sent_at,
    })),
  };
}
