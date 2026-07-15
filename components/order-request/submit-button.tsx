"use client";

import { useFormStatus } from "react-dom";

export function OrderRequestSubmitButton({ blocked, label, pendingLabel }: { blocked: boolean; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary order-submit" disabled={pending || blocked} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
}
