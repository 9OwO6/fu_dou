import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";
import instagramQr from "@/assets/image/instagram-qr.png";
import storefrontPhoto from "@/assets/image/map_back.jpg";
import wechatQr from "@/assets/image/wechat-qr.png";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

export function StoreFooter({ locale }: { locale: AppLocale }) {
  const base = `/${locale}`;
  const messages = getMessages(locale).public.footer;
  return (
    <footer className="store-footer">
      <div className="store-container footer-contact-grid">
        <section className="footer-location-card">
          <Image alt={messages.storefrontAlt} className="footer-storefront-photo" placeholder="blur" sizes="(max-width: 767px) 100vw, 58vw" src={storefrontPhoto} />
          <div className="footer-location-panel">
            <p className="footer-eyebrow">{messages.visit}</p>
            <h2>Happy Beans{locale === "zh" ? " / 福豆" : ""}</h2>
            <a href="https://maps.app.goo.gl/ZNXFUdkYNzcGx1U88" rel="noreferrer" target="_blank">
              <span>4000 Number 3 Rd #2185</span>
              <span>Richmond, BC V6X 0J8</span>
              <strong>{messages.openMap} ↗</strong>
            </a>
          </div>
        </section>
        <section className="footer-social-card">
          <div>
            <p className="footer-eyebrow">{messages.connectEyebrow}</p>
            <h2>{messages.connect}</h2>
            <p>{messages.connectBody}</p>
          </div>
          <div className="footer-qr-grid">
            <div className="footer-qr-card">
              <Image alt={messages.wechatQrAlt} src={wechatQr} />
              <strong>WeChat</strong>
              <span>{messages.scanWechat}</span>
            </div>
            <a className="footer-qr-card" href="https://www.instagram.com/happy_beans2023/" rel="noreferrer" target="_blank">
              <Image alt={messages.instagramQrAlt} src={instagramQr} />
              <strong>Instagram</strong>
              <span>@happy_beans2023 ↗</span>
            </a>
          </div>
        </section>
      </div>
      <div className="store-container footer-grid">
        <div className="footer-brand">
          <Image alt="" className="footer-logo" src={logo} />
          <div>
            <p className="font-bold">Happy Beans{locale === "zh" ? " / 福豆" : ""}</p>
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
        <span>© {new Date().getFullYear()} Happy Beans{locale === "zh" ? " 福豆" : ""}</span>
        <span>{messages.region}</span>
      </div>
    </footer>
  );
}
