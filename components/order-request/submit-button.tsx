"use client";

import { useFormStatus } from "react-dom";

export function OrderRequestSubmitButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary order-submit" disabled={pending || blocked} type="submit">
      {pending ? "正在安全保存请求…" : "提交订单请求"}
    </button>
  );
}
