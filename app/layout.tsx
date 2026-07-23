import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "호행처럼 - 매일 쓰는 3초 간편 계산기",
    template: "%s | 호행처럼", // 각 페이지 제목 뒤에 자동으로 '| 호행처럼'을 붙여줍니다!
  },
  description: "ISA, 퇴직금, 연봉 실수령액 등 실생활 필수 계산기를 3초 만에 이용해보세요.",
  openGraph: {
    title: "호행처럼 - 매일 쓰는 3초 간편 계산기",
    description: "ISA, 퇴직금, 연봉 실수령액 등 실생활 필수 계산기를 3초 만에 이용해보세요.",
    url: "https://hohaeng.vercel.app",
    siteName: "호행처럼",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}