import Link from 'next/link';

import type { RelatedMoneyTool } from '@/app/money/relatedTools';

export default function RelatedMoneyTools({
  tools,
  title = '함께 사용하면 좋은 계산기',
}: {
  tools: RelatedMoneyTool[];
  title?: string;
}) {
  if (tools.length === 0) return null;

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-blue-600">
            NEXT STEP
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
        <Link href="/money" className="text-sm font-bold text-blue-600 hover:underline">
          Money Hub 전체 보기 →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
          >
            <h3 className="font-black text-slate-900 group-hover:text-blue-700">
              {tool.title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
