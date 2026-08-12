'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CATEGORIES, TOOLS } from '@/app/tools';

export default function CalculatorDirectory() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredTools =
    activeCategory === 'all'
      ? TOOLS
      : TOOLS.filter((tool) => tool.category === activeCategory);

  return (
    <section
      id="tools"
      className="scroll-mt-20 border-b border-slate-900 bg-slate-950"
    >
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">
              SMART TOOLS
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              많이 찾는 계산기
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              복잡한 숫자를 직접 계산하지 않아도 필요한 결과를 빠르게 확인할 수 있습니다.
            </p>
          </div>
          <Link href="/money" className="text-sm font-bold text-blue-400 hover:text-blue-300">
            계산기 전체 구조 보기 →
          </Link>
        </div>

        <div className="mb-6 flex items-center space-x-2 overflow-x-auto border-b border-slate-800/60 pb-3 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 sm:text-sm ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredTools.map((tool) => {
            const categoryName =
              CATEGORIES.find((category) => category.id === tool.category)?.name ??
              tool.category;

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 ${tool.hoverColor}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-md border border-blue-900/50 bg-blue-950/80 px-2.5 py-1 text-[11px] font-bold tracking-wider text-blue-400">
                    {categoryName}
                  </span>
                  {tool.badge && (
                    <span className="rounded border border-amber-800/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h3 className="flex items-center justify-between text-lg font-bold text-white transition-colors group-hover:text-blue-300">
                  <span>{tool.title}</span>
                  <span className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
                    →
                  </span>
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {tool.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
