"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "处理中…",
  variant = "primary",
  confirmMessage,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-slate-900",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline-sky-600",
    danger: "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-600",
  }[variant];

  return (
    <button
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
