'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/app/components/ShareButton';
import { POLICY_CONFIG } from '@/app/constants';

export default function LoanCalcClient() {
  const [loanAmount, setLoanAmount] = useState<number>(10000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [loanPeriodYears, setLoanPeriodYears] = useState<number>(30);
  const [gracePeriodYears, setGracePeriodYears] = useState<number>(0);
  const [repayType, setRepayType] = useState<'equal-principal-interest' | 'equal-principal' | 'bullet'>('equal-principal-interest');

  const totalMonths = loanPeriodYears * 12;
  const graceMonths = Math.min(gracePeriodYears * 12, totalMonths - 1);
  const repayMonths = totalMonths - graceMonths;
  const monthlyRate = interestRate / 100 / 12;

  let firstMonthPayment = 0;
  let totalInterest = 0;

  if (repayType === 'equal-principal-interest') {
    if (monthlyRate > 0) {
      const monthlyPayment = Math.round(
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, repayMonths)) /
        (Math.pow(1 + monthlyRate, repayMonths) - 1)
      );
      firstMonthPayment = graceMonths > 0 ? Math.round(loanAmount * monthlyRate) : monthlyPayment;
      totalInterest = (monthlyPayment * repayMonths) - loanAmount + (Math.round(loanAmount * monthlyRate) * graceMonths);
    } else {
      firstMonthPayment = Math.round(loanAmount / repayMonths);
      totalInterest = 0;
    }
  } else if (repayType === 'equal-principal') {
    const monthlyPrincipal = loanAmount / repayMonths;
    const firstInterest = loanAmount * monthlyRate;
    firstMonthPayment = graceMonths > 0 ? Math.round(firstInterest) : Math.round(monthlyPrincipal + firstInterest);
    
    const avgInterest = (firstInterest + (monthlyPrincipal * monthlyRate)) / 2;
    totalInterest = Math.round((avgInterest * repayMonths) + (firstInterest * graceMonths));
  } else {
    const monthlyInterest = Math.round(loanAmount * monthlyRate);
    firstMonthPayment = monthlyInterest;
    totalInterest = monthlyInterest * totalMonths;
  }

  const totalPayment = loanAmount + totalInterest;

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-blue-600 font-medium mb-4 inline-block hover:underline">
          ← 메인으로 돌아가기
        </Link>

        <div className="mb-6 flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Money OS</span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">대출 원리금 상환 계산기</h1>
            <p className="text-xs text-blue-600 font-semibold mt-1">*{POLICY_CONFIG.UPDATED_AT} 대출 기준 및 금리 산정 반영</p>
          </div>
          <ShareButton />
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-xl mb-6 text-xs font-bold">
          <button
            onClick={() => setRepayType('equal-principal-interest')}
            className={`py-2.5 rounded-lg transition-all ${repayType === 'equal-principal-interest' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            원리금균등
          </button>
          <button
            onClick={() => setRepayType('equal-principal')}
            className={`py-2.5 rounded-lg transition-all ${repayType === 'equal-principal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            원금균등
          </button>
          <button
            onClick={() => setRepayType('bullet')}
            className={`py-2.5 rounded-lg transition-all ${repayType === 'bullet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            만기일시
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              대출 금액: <span className="text-blue-600 font-extrabold">{loanAmount >= 10000 ? `${(loanAmount / 10000).toFixed(1)}억` : `${loanAmount.toLocaleString()}만`}원</span>
            </label>
            <input
              type="range" min="1000" max="100000" step="1000" value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              연 대출 금리: <span className="text-blue-600 font-extrabold">{interestRate}%</span>
            </label>
            <input
              type="range" min="1.0" max="15.0" step="0.1" value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              대출 기간: <span className="text-blue-600 font-extrabold">{loanPeriodYears}년</span> ({totalMonths}개월)
            </label>
            <input
              type="range" min="1" max="40" step="1" value={loanPeriodYears}
              onChange={(e) => setLoanPeriodYears(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              거치 기간 (이자만 내는 기간): <span className="text-blue-600 font-extrabold">{gracePeriodYears}년</span>
            </label>
            <input
              type="range" min="0" max={Math.min(5, loanPeriodYears - 1)} step="1" value={gracePeriodYears}
              onChange={(e) => setGracePeriodYears(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-700 to-blue-800 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">첫 달 예상 납입금</div>
          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약 {firstMonthPayment.toLocaleString()} 만원
          </div>
          <div className="border-t border-white/20 pt-3 text-xs space-y-1.5 opacity-90">
            <div className="flex justify-between">
              <span>대출 원금:</span>
              <span className="font-bold">{loanAmount.toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between text-yellow-200">
              <span>총 예상 이자:</span>
              <span className="font-bold">+ {Math.round(totalInterest).toLocaleString()} 만원</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-white/10 pt-1.5">
              <span>총 상환 금액 (원금+이자):</span>
              <span>약 {Math.round(totalPayment).toLocaleString()} 만원</span>
            </div>
          </div>
        </div>

        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">💡 어떤 상환 방식이 유리할까요?</h2>
            <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
              <li className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <strong className="text-slate-900">원리금균등상환:</strong> 매달 내는 금액(원금+이자)이 일정하여 지출 관리에 유리합니다.
              </li>
              <li className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <strong className="text-slate-900">원금균등상환:</strong> 초반 납입금 부담은 크지만 총 이자가 가장 적습니다.
              </li>
              <li className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <strong className="text-slate-900">만기일시상환:</strong> 매달 이자만 내다가 만기에 원금을 상환합니다.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}