// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A1B2E] text-slate-100 skynews-cursor`}
      >
        {children}
      </body>
    </html>
  );
}
