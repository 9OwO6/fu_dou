export const orderStatuses = ["new", "contacted", "confirmed", "preparing", "completed", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "新请求",
  contacted: "已联系",
  confirmed: "已确认",
  preparing: "准备中",
  completed: "已完成",
  cancelled: "已取消",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && orderStatuses.includes(value as OrderStatus);
}
