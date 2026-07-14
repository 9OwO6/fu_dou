import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import { CartLink } from "@/components/cart/cart-link";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

const SearchIcon = () => (
  <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

export function StoreHeader({ locale, announcement }: { locale: AppLocale; announcement: string }) {
  const base = `/${locale}`;
  const messages = getMessages(locale).public.header;
  const navItems = [
    [messages.allProducts, `${base}/products`],
    [messages.new, `${base}/collections/new`],
    [messages.featured, `${base}/collections/featured`],
    [messages.sale, `${base}/collections/sale`],
    [messages.story, `${base}#brand-story`],
  ] as const;

  return (
    <>
      {announcement ? <div className="announcement-bar">{announcement}</div> : null}
      <header className="store-header">
        <div className="store-container flex h-full items-center justify-between gap-4">
          <Link aria-label={messages.homeLabel} className="brand-link" href={base}>
            <Image alt="Happy Beans 福豆" className="brand-logo" priority src={logo} />
            <span className="brand-name">福豆</span>
          </Link>
          <nav aria-label={messages.navLabel} className="hidden items-center gap-7 lg:flex">
            {navItems.map(([label, href]) => (
              <Link className="nav-link" href={href} key={href}>{label}</Link>
            ))}
          </nav>
          <form action={`${base}/products`} className="header-search hidden md:flex" role="search">
            <label className="sr-only" htmlFor="header-search">{messages.search}</label>
            <input id="header-search" name="q" placeholder={messages.search} type="search" />
            <button aria-label={messages.search} type="submit"><SearchIcon /></button>
          </form>
          <div className="header-actions">
            <CartLink href={`${base}/cart`} label={messages.cart} />
            <details className="mobile-menu lg:hidden">
              <summary aria-label={messages.openMenu}>
                <span aria-hidden="true" className="menu-lines" />
              </summary>
              <div className="mobile-menu-panel">
                <form action={`${base}/products`} className="mobile-search" role="search">
                  <label className="sr-only" htmlFor="mobile-search">{messages.search}</label>
                  <input id="mobile-search" name="q" placeholder={messages.searchPlaceholder} type="search" />
                  <button aria-label={messages.search} type="submit"><SearchIcon /></button>
                </form>
                <nav aria-label={messages.mobileNavLabel}>
                  {navItems.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
                  <Link href={`${base}/cart`}>{messages.cart}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
