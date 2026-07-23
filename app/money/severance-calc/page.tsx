'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SeveranceCalcPage() {
  const [monthlyPay, setMonthlyPay] = useState<number>(300); // 만원 단위
  const [bonus, setBonus] = useState<number>(0); // 연간 상여금 (만원)
  const [workingMonths, setWorkingMonths] = useState<number>(36); // 근속 월수

  // 퇴직금 간이 계산 로직: (1일 평균임금 x 30일 x 재직일수 / 365)
  // 간이: [월급 + (연간상여/12)] * (근속월수 / 12)
  const totalMonthlyBase = monthlyPay + (bonus / 12);
  const estimatedSeverance = Math.round(totalMonthlyBase * (workingMonths / 12));

  // 근속 연수 계산
  const years = Math.floor(workingMonths / 12);
  const remMonths = workingMonths % 12;

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
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">퇴직금 간편 계산기</h1>
          <p className="text-sm text-slate-500 mt-1">월급과 재직 기간만 넣으면 예상 퇴직금을 3초 만에 계산합니다.</p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              최근 3개월 평균 월급 (세전): <span className="text-blue-600 font-extrabold">{monthlyPay.toLocaleString()} 만원</span>
            </label>
            <input 
              type="range" min="100" max="1500" step="10" value={monthlyPay}
              onChange={(e) => setMonthlyPay(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              연간 상여금 총액: <span className="text-blue-600 font-extrabold">{bonus.toLocaleString()} 만원</span>
            </label>
            <input 
              type="range" min="0" max="3000" step="50" value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              총 근속 기간: <span className="text-blue-600 font-extrabold">{years}년 {remMonths}개월</span> ({workingMonths}개월)
            </label>
            <input 
              type="range" min="12" max="240" step="1" value={workingMonths}
              onChange={(e) => setWorkingMonths(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">예상 퇴직금 (세전)</div>
          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약 {estimatedSeverance.toLocaleString()} 만원
          </div>
          <div className="border-t border-white/20 pt-3 text-xs space-y-1 opacity-90">
            <div className="flex justify-between">
              <span>기본 기준 월급:</span>
              <span className="font-bold">{monthlyPay.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between">
              <span>월 평균 상여 반영액:</span>
              <span>{Math.round(bonus / 12).toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between">
              <span>근속 연수 산정:</span>
              <span>{(workingMonths / 12).toFixed(1)}년</span>
            </div>
          </div>
        </div>

        {/* ------------------ SEO 콘텐츠 영역 ------------------ */}
        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              💡 퇴직금 지급 기준 및 대상 조건
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              퇴직금은 근로자가 **1년 이상 계속 근로**하고, **주 15시간 이상** 근무한 경우 지급 대상이 됩니다. 정규직뿐만 아니라 계약직, 파트타임, 아르바이트 노동자도 조건만 충족하면 법적으로 반드시 지급받아야 합니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              📐 퇴직금 정산 계산 공식
            </h2>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-mono border border-slate-100 my-2">
              퇴직금 = 1일 평균임금 × 30일 × (재직일수 ÷ 365)
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              * 평균임금에는 퇴직 전 3개월간 지급받은 임금총액과 1년간 지급받은 상여금의 3/12, 연차수당이 포함됩니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-3">
              ❓ 퇴직금 자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 퇴직금은 퇴사 후 언제 지급받나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  근로기준법 제36조에 따라 퇴사일로부터 **14일 이내**에 지급되어야 합니다. 당사자 간 합의가 없는 상태에서 14일을 넘기면 지연이자가 발생할 수 있습니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 수습기간도 퇴직금 근속 기간에 포함되나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  네, 수습기간 및 인턴 기간도 동일한 사업장에서 계속 근무했다면 퇴직금 산정을 위한 **전체 근속 기간에 합산**됩니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 퇴직 소득세는 얼마나 나오나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  퇴직금은 근속 연수에 따라 공제 혜택(근속연수공제)이 매우 크게 적용되므로 일반 종합소득세에 비해 세금 부담이 낮습니다.
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}