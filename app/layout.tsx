import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const description = "王子平的学习笔记与思考。正在学的技术，和还没想完的问题。";

export const metadata: Metadata = {
  title: {
    default: "Kayne",
    template: "%s · Kayne",
  },
  description,
  openGraph: {
    locale: "zh_CN",
    type: "website",
    siteName: "Kayne",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
