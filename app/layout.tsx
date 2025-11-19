// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyNews.Tr – Havacılık Haber Portalı",
  description:
    "SkyNews.Tr, Türk havacılığına odaklanan premium havacılık haber portalıdır. Havayolları, havalimanları, yer hizmetleri, MRO ve daha fazlası.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-[#0A1B2E] text-slate-100 skynews-cursor`}
      >
        {children}
      </body>
    </html>
  );
}
