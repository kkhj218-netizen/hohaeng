'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/app/components/ShareButton';

export default function SeveranceCalcClient() {
  const [monthlyPay, setMonthlyPay] = useState<number>(300);
  const [bonus, setBonus] = useState<number>(0);
  const [workingMonths, setWorkingMonths] = useState<number>(36);

  const totalMonthlyBase = monthlyPay + (bonus / 12);
  const grossSeverance = Math.round(totalMonthlyBase * (workingMonths / 12));

  const serviceYears = Math.max(1, Math.ceil(workingMonths / 12));
  const years = Math.floor(workingMonths / 12);
  const remMonths = workingMonths % 12;

  let serviceDeduction = 0;
  if (serviceYears <= 5) serviceDeduction = serviceYears * 100;
  else if (serviceYears <= 10) serviceDeduction = 500 + (serviceYears - 5) * 200;
  else if (serviceYears <= 20) serviceDeduction = 1500 + (serviceYears - 10) * 250;
  else serviceDeduction = 4000 + (serviceYears - 20) * 300;

  const taxableAmount = Math.max(0, grossSeverance - serviceDeduction);
  
  let estimatedTaxRate = 0.03;
  if (taxableAmount > 10000) estimatedTaxRate = 0.08;
  if (taxableAmount > 30000) estimatedTaxRate = 0.12;

  const estimatedTax = Math.round(taxableAmount * estimatedTaxRate);
  const netSeverance = Math.max(0, grossSeverance - estimatedTax);

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-blue-600 font-medium mb-4 inline-block hover:underline">
          ← 메인으로 돌아가기
        </Link>

        <div className="mb-6 flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Money OS</span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">퇴직금 & 실수령액 계산기</h1>
            <p className="text-sm text-slate-500 mt-1">예상 퇴직금부터 세금 공제 후 실수령액까지 3초 만에 계산해보세요.</p>
          </div>
          <ShareButton />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              최근 3개월 평균 월급 (세전): <span className="text-blue-600 font-extrabold">{monthlyPay.toLocaleString()} 만원</span>
            </label>
            <input type="range" min="100" max="1500" step="10" value={monthlyPay} onChange={(e) => setMonthlyPay(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              연간 상여금 총액: <span className="text-blue-600 font-extrabold">{bonus.toLocaleString()} 만원</span>
            </label>
            <input type="range" min="0" max="3000" step="50" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              총 근속 기간: <span className="text-blue-600 font-extrabold">{years}년 {remMonths}개월</span> ({workingMonths}개월)
            </label>
            <input type="range" min="12" max="240" step="1" value={workingMonths} onChange={(e) => setWorkingMonths(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">예상 실수령액 (세후)</div>
          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약 {netSeverance.toLocaleString()} 만원
          </div>
          <div className="border-t border-white/20 pt-3 text-xs space-y-1.5 opacity-90">
            <div className="flex justify-between">
              <span>세전 퇴직금:</span>
              <span className="font-bold">{grossSeverance.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between text-yellow-200">
              <span>예상 퇴직소득세(지방세 포함):</span>
              <span>- {estimatedTax.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between opacity-75">
              <span>근속연수 공제 산정:</span>
              <span>{serviceYears}년 인정 (-{serviceDeduction.toLocaleString()}만원 공제)</span>
            </div>
          </div>
        </div>

        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">💡 퇴직소득세는 어떻게 계산되나요?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              퇴직금은 근로자가 수년에 걸쳐 형성한 소득이므로 일반 근로소득세와 달리 **'근속연수공제'** 및 **'12배 환산 과세'** 혜택을 제공합니다. 오래 일할수록 세금 공제 폭이 커져 실제 부담하는 세율(실효세율)은 보통 3~8% 수준으로 매우 낮습니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">💰 IRP(개인형 퇴직연금) 계좌 수령 시 30% 절세!</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              퇴직금을 일시금으로 받지 않고 **IRP 계좌**로 이체한 뒤 연금으로 수령(만 55세 이후)하면 **퇴직소득세의 30~40%를 감면**받을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-3">❓ 자주 묻는 질문 (FAQ)</h2>
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 퇴직금 세금도 연말정산에 포함되나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  아닙니다. 퇴직소득은 **'분리과세'** 대상이므로 다른 근로소득이나 종합소득과 합산되지 않고 별도로 세금이 정산되어 끝납니다.
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}