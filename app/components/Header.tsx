'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-blue-600 tracking-tight">
          HOHAENG OS
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium text-slate-700 overflow-x-auto py-2">
          <Link href="/" className="hover:text-blue-600 whitespace-nowrap px-2 py-1">
            계산기
          </Link>
          <Link href="/blog?cat=guide" className="hover:text-blue-600 whitespace-nowrap px-2 py-1">
            각종 정보
          </Link>
          <Link href="/blog?cat=log" className="hover:text-blue-600 whitespace-nowrap px-2 py-1 font-semibold text-blue-600">
            호행의 일지
          </Link>
          <Link href="/blog?cat=mindset" className="hover:text-blue-600 whitespace-nowrap px-2 py-1">
            마인드셋
          </Link>
          <Link href="/blog?cat=analysis" className="hover:text-blue-600 whitespace-nowrap px-2 py-1">
            종목 및 시황분석
          </Link>
        </nav>
      </div>
    </header>
  );
}