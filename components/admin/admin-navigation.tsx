"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FolderIcon, HomeIcon, OrderIcon, ProductIcon, StoreIcon } from "./admin-icons";

const links = [
  { href: "/admin", label: "后台概览", exact: true, icon: HomeIcon },
  { href: "/admin/products", label: "商品管理", exact: false, icon: ProductIcon },
  { href: "/admin/categories", label: "分类管理", exact: false, icon: FolderIcon },
  { href: "/admin/orders", label: "订单请求", exact: false, icon: OrderIcon },
  { href: "/admin/homepage", label: "首页运营", exact: false, icon: StoreIcon },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="min-w-0 max-w-full" aria-label="后台导航">
      <ul className="flex w-full max-w-full gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li className="shrink-0 lg:shrink" key={link.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16758a] ${
                  active ? "bg-[#fff7c2] text-[#292c30] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#e7bd00]" : "text-[#62676d] hover:bg-[#fffdf8] hover:text-[#292c30]"
                }`}
                href={link.href}
              >
                <Icon className="size-5 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
