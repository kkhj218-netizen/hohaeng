'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/app/components/ShareButton';

export default function SalaryCalcPage() {
  const [annualSalary, setAnnualSalary] = useState<number>(4000); // 만원 단위

  // 월 세전 금액
  const monthlyGross = Math.round((annualSalary * 10000) / 12);

  // 4대보험 간이 요율 (2026년 기준 근사치)
  const nationalPension = Math.min(monthlyGross * 0.045, 265500); // 국민연금 (4.5%, 상한선 적용)
  const healthInsurance = monthlyGross * 0.03545; // 건강보험 (3.545%)
  const longTermCare = healthInsurance * 0.1295; // 장기요양 (건강보험의 12.95%)
  const employmentInsurance = monthlyGross * 0.009; // 고용보험 (0.9%)

  // 근로소득세 및 지방소득세 간이 추정 (기본 1인 가구 기준)
  let incomeTax = 0;
  if (monthlyGross > 2000000) incomeTax = (monthlyGross - 2000000) * 0.08;
  if (monthlyGross > 4000000) incomeTax = 160000 + (monthlyGross - 4000000) * 0.15;
  if (monthlyGross > 7000000) incomeTax = 610000 + (monthlyGross - 7000000) * 0.22;

  const localTax = incomeTax * 0.1; // 지방소득세 (10%)

  // 총 공제액 및 월 실수령액
  const totalDeduction = Math.round(nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localTax);
  const monthlyNet = Math.max(0, monthlyGross - totalDeduction);

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-blue-600 font-medium mb-4 inline-block hover:underline">
          ← 메인으로 돌아가기
        </Link>

        {/* 타이틀 및 공유 버튼 */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Money OS</span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">연봉 실수령액 계산기</h1>
            <p className="text-sm text-slate-500 mt-1">4대 보험과 세금을 공제한 진짜 내 월급을 확인하세요.</p>
          </div>
          <ShareButton />
        </div>

        {/* 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              희망/현재 연봉 (세전): <span className="text-blue-600 font-extrabold">{annualSalary.toLocaleString()} 만원</span>
            </label>
            <input 
              type="range" min="2000" max="15000" step="100" value={annualSalary}
              onChange={(e) => setAnnualSalary(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">월 예상 실수령액 (세후)</div>
          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약 {Math.round(monthlyNet / 10000).toLocaleString()}만 원 
            <span className="text-lg font-normal text-white/80 ml-1">({monthlyNet.toLocaleString()}원)</span>
          </div>
          
          <div className="border-t border-white/20 pt-3 text-xs space-y-1.5 opacity-90">
            <div className="flex justify-between">
              <span>월 세전 금액:</span>
              <span className="font-bold">{Math.round(monthlyGross / 10000).toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between text-yellow-200">
              <span>총 월 공제액 (4대보험+세금):</span>
              <span>- {Math.round(totalDeduction / 10000).toLocaleString()} 만원</span>
            </div>
          </div>
        </div>

        {/* 공제 세부 내역 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 mb-8 space-y-2 text-xs text-slate-600">
          <h3 className="font-bold text-slate-900 text-sm mb-3">📋 월 예상 공제 항목 상세</h3>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>국민연금 (4.5%)</span>
            <span className="font-medium text-slate-800">{Math.round(nationalPension).toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>건강보험 (3.545%)</span>
            <span className="font-medium text-slate-800">{Math.round(healthInsurance).toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>장기요양보험</span>
            <span className="font-medium text-slate-800">{Math.round(longTermCare).toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>고용보험 (0.9%)</span>
            <span className="font-medium text-slate-800">{Math.round(employmentInsurance).toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>근로소득세 (간이세액)</span>
            <span className="font-medium text-slate-800">{Math.round(incomeTax).toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between py-1">
            <span>지방소득세 (10%)</span>
            <span className="font-medium text-slate-800">{Math.round(localTax).toLocaleString()} 원</span>
          </div>
        </div>

        {/* SEO 콘텐츠 */}
        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              💡 연봉 실수령액과 계약 연봉이 다른 이유
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              근로계약서상의 연봉에서 **4대 보험(국민연금, 건강보험, 장기요양, 고용보험)**과 **소득세(근로소득세, 지방소득세)**가 원천징수되어 차감되기 때문입니다. 연봉이 올라갈수록 소득세율 구간이 높아져 공제 비율도 커집니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-3">
              ❓ 자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 부양가족 수에 따라 실수령액이 달라지나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  네, 본인 외에 공제 대상 부양가족(배우자, 자녀 등)이 늘어나면 간이세액표 기준 근로소득세가 감면되어 실수령액이 늘어납니다. 본 계산기는 기본 1인 가구 기준입니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 식대 등 비과세 항목이 포함되면 어떻게 되나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  월 20만 원 한도의 식대 등 비과세 항목이 포함되어 있다면 과세 대상 금액이 줄어들어 실제 받아가는 실수령액이 약간 더 높아집니다.
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}