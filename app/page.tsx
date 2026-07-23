'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TOOLS, CATEGORIES } from './tools';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredTools = activeCategory === 'all'
    ? TOOLS
    : TOOLS.filter((tool) => tool.category === activeCategory);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* 상단 럭셔리 네비게이션 헤더 */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xl font-black tracking-tight text-white font-sans">호행처럼</span>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            HOHAENG OS v1.0
          </span>
        </div>
      </header>

      {/* 메인 히어로 섹션 */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-12 pb-8 text-center sm:text-left">
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-semibold tracking-wide">
          ✨ 스마트 라이프 & 금융 가이드
        </div>
        
        {/* 결정하신 메인 슬로건 */}
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight sm:leading-snug">
          돈과 시간을 아껴주는<br className="hidden sm:inline" /> <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">스마트한 수치 가이드, 호행처럼</span>
        </h1>
        
        {/* 결정하신 서브 슬로건 */}
        <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
          연봉 실수령액, 퇴직금, 대출 이자부터 일상의 수치까지 3초 만에 명확하게 확인하세요.
        </p>

        {/* 모바일 대응 스크롤 카테고리 필터 탭 */}
        <div className="mt-8 flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/60">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* 도구 그리드 카드 섹션 */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredTools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className={`group relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 ${tool.hoverColor}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-bold tracking-wider text-blue-400 uppercase bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-900/50">
                  {tool.category}
                </span>
                {tool.badge && (
                  <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    {tool.badge}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                <span>{tool.title}</span>
                <span className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/50">
            <p className="text-slate-400 text-sm">해당 카테고리의 새로운 도구가 곧 출시될 예정입니다! 🚀</p>
          </div>
        )}
      </section>

      {/* 풋터 */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4">
          <p>© {new Date().getFullYear()} 호행처럼 (Hohaeng). All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-600">
            본 사이트에서 제공하는 계산 결과는 참고용이며, 정확한 세법 및 정책은 관련 기관 기준을 확인하세요.
          </p>
        </div>
      </footer>
    </main>
  );
}