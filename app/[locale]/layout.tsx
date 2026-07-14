import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { isSupportedLocale, supportedLocales } from "@/lib/i18n/config";
import { CartProvider } from "@/components/cart/cart-provider";
import { StoreFooter } from "@/components/layout/store-footer";
import { StoreHeader } from "@/components/layout/store-header";
import { getPublicHomepageConfiguration } from "@/lib/homepage/data";

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const homepage = await getPublicHomepageConfiguration();
  const announcement = homepage.sections.find((section) => section.sectionType === "announcement");

  return (
    <CartProvider>
      <div className="store-shell">
        <StoreHeader announcement={announcement?.translation.body ?? ""} locale={locale} />
        {children}
        <StoreFooter locale={locale} />
      </div>
    </CartProvider>
  );
}
