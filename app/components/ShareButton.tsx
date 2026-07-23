'use client';

import { useState } from 'react';

export default function ShareButton() {
  const [copied, setCopied] = useState<boolean>(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex-shrink-0 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
    >
      {copied ? '✅ 복사됨!' : '🔗 공유'}
    </button>
  );
}