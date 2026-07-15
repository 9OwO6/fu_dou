"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "处理中…",
  variant = "primary",
  confirmMessage,
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "border border-[#e2c200] bg-[#f7e653] text-[#292c30] shadow-sm hover:bg-[#f3dc2f] focus-visible:outline-[#16758a]",
    secondary: "border border-[#c9c3b8] bg-white text-[#292c30] hover:bg-[#fffdf8] focus-visible:outline-[#16758a]",
    danger: "border border-[#d9a6aa] bg-white text-[#a23b43] hover:bg-[#fff5f5] focus-visible:outline-[#a23b43]",
  }[variant];

  return (
    <button
      className={`min-h-11 rounded-xl px-5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${styles}`}
      disabled={pending || disabled}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
