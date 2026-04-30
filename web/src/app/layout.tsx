import type { Metadata } from "next";
import { Noto_Sans_KR, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "건설현장 대시보드",
  description: "전사 현장 통합 대시보드 - 남광토건, 극동건설, 금광기업",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontSize: "20px" }}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppLayout>{children}</AppLayout>
      </body>
      {/* Kakao Maps SDK — application-wide. `autoload=false` keeps the global
       *  inert until each map component calls `kakao.maps.load(cb)`, which
       *  means we don't actually need `beforeInteractive` (the older pattern
       *  trips React 19's "sync script outside <head>" check). The default
       *  `afterInteractive` strategy is correct here. */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`}
      />
    </html>
  );
}
