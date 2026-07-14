"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { sendOrderRequestEmails } from "@/lib/email/order-request-emails";
import { isOrderStatus } from "@/lib/orders/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderAdminActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function updateOrderRequestAction(
  orderRequestId: string,
  _previous: OrderAdminActionState,
  formData: FormData,
): Promise<OrderAdminActionState> {
  await requireAdmin();
  const status = formData.get("status");
  const adminNote = formData.get("adminNote");
  if (!UUID_PATTERN.test(orderRequestId) || !isOrderStatus(status) || typeof adminNote !== "string" || adminNote.length > 2000) {
    return { status: "error", message: "请检查状态和管理员备注。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_order_request", {
    p_order_request_id: orderRequestId,
    p_status: status,
    p_admin_note: adminNote,
  });
  if (error) {
    return {
      status: "error",
      message: error.message.includes("Invalid order request status transition")
        ? "状态必须按新请求 → 已联系 → 已确认 → 准备中 → 已完成推进，也可在完成前取消。"
        : "订单请求暂时无法更新，请稍后重试。",
    };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderRequestId}`);
  return { status: "success", message: "订单状态和管理员备注已保存。" };
}

export async function retryOrderEmailAction(formData: FormData) {
  await requireAdmin();
  const orderRequestId = formData.get("orderRequestId");
  const kind = formData.get("kind");
  if (
    typeof orderRequestId !== "string"
    || !UUID_PATTERN.test(orderRequestId)
    || (kind !== "owner_notification" && kind !== "customer_confirmation")
  ) return;
  await sendOrderRequestEmails(orderRequestId, kind);
  revalidatePath(`/admin/orders/${orderRequestId}`);
}
