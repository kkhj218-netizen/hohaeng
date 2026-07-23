'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function IsaCalcPage() {
  const [amount, setAmount] = useState<number>(1000); // 만원 단위
  const [years, setYears] = useState<number>(3);
  const [rate, setRate] = useState<number>(5);

  // 계산 로직 (간이 계산)
  const totalProfit = Math.round(amount * (rate / 100) * years);
  const generalTax = Math.round(totalProfit * 0.154); // 일반계좌 15.4%
  const isaTax = totalProfit > 200 ? Math.round((totalProfit - 200) * 0.099) : 0; // ISA 200만원 비과세 후 9.9%
  const savedTax = generalTax - isaTax;

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        {/* 상단 뒤로가기 */}
        <Link href="/" className="text-sm text-blue-600 font-medium mb-4 inline-block hover:underline">
          ← 메인으로 돌아가기
        </Link>

        {/* 타이틀 */}
        <div className="mb-6">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Money OS</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">ISA 절세 효과 계산기</h1>
          <p className="text-sm text-slate-500 mt-1">투자 금액과 기간에 따른 절세 혜택을 3초 만에 계산해보세요.</p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              연간 투자금액: <span className="text-blue-600 font-extrabold">{amount.toLocaleString()} 만원</span>
            </label>
            <input 
              type="range" min="100" max="2000" step="100" value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              투자기간: <span className="text-blue-600 font-extrabold">{years}년</span>
            </label>
            <input 
              type="range" min="3" max="5" step="1" value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              예상 연 수익률: <span className="text-blue-600 font-extrabold">{rate}%</span>
            </label>
            <input 
              type="range" min="1" max="20" step="1" value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">ISA 계좌 이용 시 아끼는 세금</div>
          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약 {savedTax.toLocaleString()} 만원 절약!
          </div>
          <div className="border-t border-white/20 pt-3 text-xs space-y-1 opacity-90">
            <div className="flex justify-between">
              <span>예상 총 수익:</span>
              <span className="font-bold">{totalProfit.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between">
              <span>일반계좌 세금(15.4%):</span>
              <span>{generalTax.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between">
              <span>ISA 세금:</span>
              <span>{isaTax.toLocaleString()} 만원</span>
            </div>
          </div>
        </div>

        {/* SEO 설명 콘텐츠 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 text-sm space-y-3">
          <h2 className="font-bold text-base text-slate-900">💡 ISA 계좌, 왜 꼭 써야 할까요?</h2>
          <p className="leading-relaxed text-xs text-slate-600">
            ISA(개인종합자산관리계좌)는 이자 및 배당소득에 대해 최대 200만원(서민형 400만원)까지 비과세 혜택을 제공합니다. 초과 수익에 대해서도 15.4%가 아닌 9.9% 분리과세가 적용되어 절세 효과가 매우 큽니다.
          </p>
        </div>
      </div>
    </main>
  );
}