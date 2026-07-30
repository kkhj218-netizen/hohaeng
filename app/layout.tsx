import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/app/components/Header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hohaeng.vercel.app'),

  title: '호행처럼 - 스마트한 금융 & 라이프 가이드',

  description: '돈과 시간을 아껴주는 스마트한 수치 가이드',

  verification: {
    google: 'nXO5xT2zh_3lpjUhYw61VwYIhl35XB92KZW0QVJHEvg',
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
        <Header />

        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}