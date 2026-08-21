import type { Metadata } from "next";
import Script from "next/script";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import Header from "@/app/components/Header";
import MarketQuickNav from "@/app/components/MarketQuickNav";
import PwaRegister from "@/app/components/PwaRegister";

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
  metadataBase: new URL(
    "https://hohaeng.vercel.app"
  ),

  title:
    "호행처럼 - 스마트한 금융 & 라이프 가이드",

  description:
    "돈과 시간을 아껴주는 스마트한 수치 가이드",

  applicationName: "호행처럼",
  creator: "호행처럼",
  publisher: "호행처럼",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "호행처럼",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // RSS 자동발견
  alternates: {
    types: {
      "application/rss+xml":
        "/rss.xml",
    },
  },

  verification: {
    google:
      "nXO5xT2zh_3lpjUhYw61VwYIhl35XB92KZW0QVJHEvg",

    other: {
      "naver-site-verification":
        "370cab62064297724834583b6e0aa3f2d8d3785e",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col`}
      >
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1531409891320331"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PRGFZWYJ0S"
          strategy="afterInteractive"
        />

        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PRGFZWYJ0S');
          `}
        </Script>

        <PwaRegister />
        <Header />
        <MarketQuickNav />

        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
