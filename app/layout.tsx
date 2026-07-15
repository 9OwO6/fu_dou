import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Happy Beans | Cute homeware and gifts",
    template: "%s | Happy Beans",
  },
  description: "Browse cute Happy Beans homeware, cups, tableware, and gifts, with all prices shown in CAD.",
  openGraph: {
    locale: "en_CA",
    siteName: "Happy Beans / 福豆",
    type: "website",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = (await headers()).get("x-happy-beans-locale") === "zh" ? "zh" : "en";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
