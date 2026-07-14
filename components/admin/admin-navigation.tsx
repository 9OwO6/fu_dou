"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "后台概览", exact: true },
  { href: "/admin/products", label: "商品管理", exact: false },
  { href: "/admin/categories", label: "分类管理", exact: false },
  { href: "/admin/orders", label: "订单请求", exact: false },
  { href: "/admin/homepage", label: "首页运营", exact: false },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="rounded-2xl border border-slate-200 bg-white p-3" aria-label="后台导航">
      <ul className="space-y-1">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                  active ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-100"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
