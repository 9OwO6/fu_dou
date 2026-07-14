import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

export function StoreFooter({ locale }: { locale: AppLocale }) {
  const base = `/${locale}`;
  const messages = getMessages(locale).public.footer;
  return (
    <footer className="store-footer">
      <div className="store-container footer-grid">
        <div className="footer-brand">
          <Image alt="" className="footer-logo" src={logo} />
          <div>
            <p className="font-bold">Happy Beans / 福豆</p>
            <p className="mt-2 text-sm leading-6 text-[var(--hb-text-muted)]">{messages.tagline}</p>
          </div>
        </div>
        <div>
          <h2>{messages.browse}</h2>
          <Link href={`${base}/products`}>{messages.allProducts}</Link>
          <Link href={`${base}/collections/new`}>{messages.new}</Link>
          <Link href={`${base}/collections/sale`}>{messages.sale}</Link>
        </div>
        <div>
          <h2>{messages.about}</h2>
          <Link href={`${base}#brand-story`}>{messages.story}</Link>
          <Link href={`${base}#fulfillment`}>{messages.fulfillment}</Link>
          <Link href={`${base}#faq`}>{messages.faq}</Link>
        </div>
        <div>
          <h2>{messages.shopping}</h2>
          <p>{messages.currency}</p>
          <p>{messages.confirmation}</p>
        </div>
      </div>
      <div className="store-container footer-bottom">
        <span>© {new Date().getFullYear()} Happy Beans 福豆</span>
        <span>{messages.region}</span>
      </div>
    </footer>
  );
}
