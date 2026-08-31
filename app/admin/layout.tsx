import type { Metadata } from 'next';
import Link from 'next/link';

import AdminSeoLocator from './AdminSeoLocator';

export const metadata: Metadata = {
  title: '호행처럼 관리자',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSeoLocator />
      {children}
      <Link
        href="/admin/seo-posts"
        className="fixed bottom-4 right-4 z-50 rounded-full border border-emerald-700 bg-slate-950/95 px-4 py-2.5 text-xs font-black text-emerald-300 shadow-xl backdrop-blur hover:border-emerald-400 hover:text-emerald-200 sm:bottom-6 sm:right-6"
      >
        🔎 투자글 SEO
      </Link>
    </>
  );
}
