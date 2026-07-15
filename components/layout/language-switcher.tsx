"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { AppLocale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale, label }: { locale: AppLocale; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetLocale: AppLocale = locale === "en" ? "zh" : "en";
  const targetPath = pathname.replace(/^\/(?:en|zh)(?=\/|$)/, `/${targetLocale}`);
  const query = searchParams.toString();

  return (
    <Link aria-label={label} className="nav-link whitespace-nowrap" href={`${targetPath}${query ? `?${query}` : ""}`} hrefLang={targetLocale} lang={targetLocale}>
      {locale === "en" ? "中文" : "English"}
    </Link>
  );
}
