import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Happy Beans / 福豆｜可爱家居与礼物",
    template: "%s｜Happy Beans 福豆",
  },
  description: "浏览 Happy Beans 福豆的可爱家居、杯具、餐具与礼物小物，价格均以 CAD 显示。",
  openGraph: {
    locale: "zh_CA",
    siteName: "Happy Beans / 福豆",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
