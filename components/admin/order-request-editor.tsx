"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateOrderRequestAction,
  type OrderAdminActionState,
} from "@/app/admin/(protected)/orders/actions";
import { orderStatusLabels, orderStatuses, type OrderStatus } from "@/lib/orders/status";

const initialState: OrderAdminActionState = { status: "idle", message: "" };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "保存中…" : "保存处理状态"}</button>;
}

export function OrderRequestEditor({ orderId, status, adminNote }: { orderId: string; status: OrderStatus; adminNote: string | null }) {
  const [state, action] = useActionState(updateOrderRequestAction.bind(null, orderId), initialState);
  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">处理状态与管理员备注</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">状态按业务顺序推进。顾客不会通过公开页面看到管理员备注。</p>
      <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
        <label className="grid gap-2 text-sm font-semibold">当前状态
          <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" defaultValue={status} name="status">
            {orderStatuses.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">管理员备注
          <textarea className="min-h-28 rounded-xl border border-slate-300 p-3 font-normal" defaultValue={adminNote ?? ""} maxLength={2000} name="adminNote" />
        </label>
      </div>
      {state.status !== "idle" ? <p className={`mt-4 text-sm font-semibold ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <div className="mt-5"><SaveButton /></div>
    </form>
  );
}
