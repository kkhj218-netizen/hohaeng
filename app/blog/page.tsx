'use client';

import { useState } from 'react';
import Link from 'next/link';

// 예시 데이터 (실제 데이터 적용 시 getFilteredArticles 연동)
const mockArticles = [
  {
    slug: 'isa-2026-03',
    title: '2026년 3월 ISA 배당금 입금 일지',
    description: '이번 달 ISA 계좌로 수령한 배당금 내역과 재투자 계획입니다.',
    date: '2026-03-31',
    category: 'log',
    subcategory: 'dividend',
    year: '2026',
  },
  {
    slug: 'invest-2026-02',
    title: '2026년 2월 월간 포트폴리오 결산',
    description: '미국 지수 ETF 매수 기록 및 자산 비중 변화',
    date: '2026-02-28',
    category: 'log',
    subcategory: 'invest',
    year: '2026',
  },
  {
    slug: 'routine-morning',
    title: '지치지 않는 6시 아침 루틴 형성기',
    description: '개발과 직장 생활을 병행하기 위한 데일리 시간 관리법',
    date: '2026-01-15',
    category: 'log',
    subcategory: 'routine',
    year: '2026',
  },
];

export default function BlogListPage() {
  const [subCat, setSubCat] = useState('all');
  const [selectedYear, setSelectedYear] = useState('2026');

  // 필터링 적용
  const filteredArticles = mockArticles.filter((article) => {
    const matchSubCat = subCat === 'all' || article.subcategory === subCat;
    const matchYear = selectedYear === 'all' || article.year === selectedYear;
    return matchSubCat && matchYear;
  });

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">📝 호행의 일지</h1>

      {/* 필터 영역 */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 flex flex-wrap gap-4 items-center justify-between">
        {/* 세부 주제 버튼 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubCat('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subCat === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setSubCat('invest')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subCat === 'invest'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            📈 투자일지
          </button>
          <button
            onClick={() => setSubCat('dividend')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subCat === 'dividend'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            💰 배당일지
          </button>
          <button
            onClick={() => setSubCat('routine')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subCat === 'routine'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            🏃‍♂️ 일상/루틴
          </button>
        </div>

        {/* 연도 선택 드롭다운 */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-sm font-medium text-slate-600">
            연도:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-1.5 border border-slate-300 rounded-lg bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">연도 전체</option>
            <option value="2026">2026년</option>
            <option value="2027">2027년</option>
          </select>
        </div>
      </div>

      {/* 아티클 리스트 */}
      <div className="grid gap-4">
        {filteredArticles.length === 0 ? (
          <p className="text-slate-500 text-center py-8">등록된 글이 없습니다.</p>
        ) : (
          filteredArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="block p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                  {article.subcategory}
                </span>
                <span className="text-xs text-slate-400">{article.date}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{article.title}</h2>
              <p className="text-sm text-slate-600 line-clamp-2">{article.description}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}