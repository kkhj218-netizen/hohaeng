import type { Metadata } from 'next';
import Link from 'next/link';

import AdminEditSlugControl from './AdminEditSlugControl';
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
      <AdminEditSlugControl />
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6 sm:flex-row">
        <Link
          href="/admin/internal-links"
          className="rounded-full border border-cyan-700 bg-slate-950/95 px-4 py-2.5 text-xs font-black text-cyan-300 shadow-xl backdrop-blur hover:border-cyan-400 hover:text-cyan-200"
        >
          🔗 내부링크
        </Link>
        <Link
          href="/admin/seo-posts"
          className="rounded-full border border-emerald-700 bg-slate-950/95 px-4 py-2.5 text-xs font-black text-emerald-300 shadow-xl backdrop-blur hover:border-emerald-400 hover:text-emerald-200"
        >
          🔎 전체 글 SEO
        </Link>
      </div>
    </>
  );
}
