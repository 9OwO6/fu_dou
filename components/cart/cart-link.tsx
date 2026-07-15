"use client";

import Link from "next/link";

import { useCart } from "./cart-provider";

export function CartLink({ href, label, countLabel }: { href: string; label: string; countLabel: string }) {
  const { hydrated, itemCount } = useCart();
  return (
    <Link aria-label={hydrated && itemCount > 0 ? countLabel.replace("{label}", label).replace("{count}", String(itemCount)) : label} className="cart-link" href={href}>
      <svg aria-hidden="true" fill="none" height="21" viewBox="0 0 24 24" width="21">
        <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.4 8H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <circle cx="10" cy="20" fill="currentColor" r="1.3" /><circle cx="18" cy="20" fill="currentColor" r="1.3" />
      </svg>
      <span className="cart-link-label">{label}</span>
      {hydrated && itemCount > 0 ? <span className="cart-count">{itemCount > 99 ? "99+" : itemCount}</span> : null}
    </Link>
  );
}
