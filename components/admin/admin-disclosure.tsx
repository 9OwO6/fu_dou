import type { ReactNode } from "react";

import { ChevronIcon } from "./admin-icons";

export function AdminDisclosure({
  children,
  defaultOpen = false,
  description,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  description?: string;
  title: string;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-[#e5e0d7] bg-white" open={defaultOpen}>
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fffdf8] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#16758a] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-lg font-semibold text-[#292c30]">{title}</span>
          {description ? <span className="mt-1 block text-sm leading-6 text-[#62676d]">{description}</span> : null}
        </span>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e5e0d7] bg-white text-[#62676d] transition group-open:rotate-180 group-hover:border-[#c9c3b8] group-hover:text-[#292c30]">
          <ChevronIcon />
        </span>
      </summary>
      <div className="border-t border-[#e5e0d7] bg-[#fffdf8]/55 p-4 sm:p-6">{children}</div>
    </details>
  );
}
