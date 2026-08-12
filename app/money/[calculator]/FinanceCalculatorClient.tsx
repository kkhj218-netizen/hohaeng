'use client';

import { useMemo, useState } from 'react';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import RelatedMoneyTools from '@/app/components/RelatedMoneyTools';
import ShareButton from '@/app/components/ShareButton';
import {
  CALCULATORS,
  type CalculatorSlug,
} from '@/app/money/calculatorCatalog';
import { CALCULATOR_GUIDES } from '@/app/money/calculatorGuides';
import { getRelatedTools } from '@/app/money/relatedTools';

const accentClasses = {
  blue: {
    badge: 'bg-blue-50 text-blue-700',
    button: 'bg-blue-600',
    result: 'from-blue-600 to-indigo-700',
    soft: 'border-blue-100 bg-blue-50 text-blue-900',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700',
    button: 'bg-emerald-600',
    result: 'from-emerald-600 to-teal-700',
    soft: 'border-emerald-100 bg-emerald-50 text-emerald-900',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700',
    button: 'bg-violet-600',
    result: 'from-violet-600 to-indigo-700',
    soft: 'border-violet-100 bg-violet-50 text-violet-900',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700',
    button: 'bg-amber-600',
    result: 'from-amber-500 to-orange-600',
    soft: 'border-amber-100 bg-amber-50 text-amber-900',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700',
    button: 'bg-rose-600',
    result: 'from-rose-600 to-pink-700',
    soft: 'border-rose-100 bg-rose-50 text-rose-900',
  },
};

function toWon(manwon: number) {
  return Math.max(0, manwon) * 10000;
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatManwon(value: number) {
  return `${Math.round(value / 10000).toLocaleString('ko-KR')}만 원`;
}

function futureValue({
  initial,
  monthly,
  annualRate,
  years,
}: {
  initial: number;
  monthly: number;
  annualRate: number;
  years: number;
}) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return initial + monthly * months;
  }

  const growth = Math.pow(1 + monthlyRate, months);

  return (
    initial * growth +
    monthly * ((growth - 1) / monthlyRate)
  );
}

function requiredMonthlyContribution({
  current,
  target,
  annualRate,
  years,
}: {
  current: number;
  target: number;
  annualRate: number;
  years: number;
}) {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return Math.max(0, (target - current) / months);
  }

  const growth = Math.pow(1 + monthlyRate, months);
  const remaining = target - current * growth;

  return Math.max(
    0,
    remaining * (monthlyRate / (growth - 1))
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <span className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) =>
            onChange(
              Math.min(
                max ?? Number.POSITIVE_INFINITY,
                Math.max(
                  min,
                  Number(event.target.value) || 0
                )
              )
            )
          }
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-right text-base font-black text-slate-900 outline-none"
        />

        <span className="shrink-0 border-l border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
          {unit}
        </span>
      </span>
    </label>
  );
}

function ResultRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/15 py-2.5 last:border-b-0">
      <span className="text-sm text-white/80">
        {label}
      </span>
      <span
        className={
          emphasize
            ? 'text-lg font-black text-yellow-200'
            : 'text-sm font-black text-white'
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function FinanceCalculatorClient({
  calculator,
}: {
  calculator: CalculatorSlug;
}) {
  const definition = CALCULATORS[calculator];
  const colors = accentClasses[definition.accent];
  const guide = CALCULATOR_GUIDES[calculator];
  const relatedTools = getRelatedTools(calculator);

  const [initialAmount, setInitialAmount] =
    useState(1000);
  const [monthlyAmount, setMonthlyAmount] =
    useState(100);
  const [annualRate, setAnnualRate] =
    useState(7);
  const [years, setYears] = useState(5);
  const [targetAmount, setTargetAmount] =
    useState(10000);
  const [dividendYield, setDividendYield] =
    useState(4);
  const [dividendTaxRate, setDividendTaxRate] =
    useState(15.4);
  const [currentShares, setCurrentShares] =
    useState(10);
  const [currentAverage, setCurrentAverage] =
    useState(50000);
  const [newShares, setNewShares] =
    useState(5);
  const [newPrice, setNewPrice] =
    useState(40000);
  const [monthlyIncome, setMonthlyIncome] =
    useState(350);
  const [monthlyExpense, setMonthlyExpense] =
    useState(250);
  const [currentReserve, setCurrentReserve] =
    useState(500);
  const [targetMonths, setTargetMonths] =
    useState(6);
  const [interestTaxRate, setInterestTaxRate] =
    useState(15.4);
  const [currentValue, setCurrentValue] =
    useState(1200);
  const [lossRate, setLossRate] =
    useState(20);
  const [riskPercent, setRiskPercent] =
    useState(1);
  const [entryPrice, setEntryPrice] =
    useState(50000);
  const [stopPrice, setStopPrice] =
    useState(47000);
  const [retirementExpense, setRetirementExpense] =
    useState(250);
  const [withdrawalRate, setWithdrawalRate] =
    useState(4);
  const [inflationRate, setInflationRate] =
    useState(2.5);

  const calculation = useMemo(() => {
    if (calculator === 'compound-calc') {
      const initial = toWon(initialAmount);
      const monthly = toWon(monthlyAmount);
      const total = futureValue({
        initial,
        monthly,
        annualRate,
        years,
      });
      const principal =
        initial + monthly * years * 12;

      return {
        headline: formatManwon(total),
        rows: [
          ['총 납입 원금', formatWon(principal)],
          ['예상 투자 수익', formatWon(total - principal)],
          ['예상 최종 자산', formatWon(total)],
        ],
      };
    }

    if (calculator === 'monthly-investment-calc') {
      const monthly = toWon(monthlyAmount);
      const periods = [1, 3, 5, 10];
      const selectedTotal = futureValue({
        initial: 0,
        monthly,
        annualRate,
        years,
      });

      return {
        headline: formatManwon(selectedTotal),
        rows: periods.map((period) => [
          `${period}년 뒤`,
          formatWon(
            futureValue({
              initial: 0,
              monthly,
              annualRate,
              years: period,
            })
          ),
        ]),
      };
    }

    if (calculator === 'goal-calc') {
      const current = toWon(initialAmount);
      const target = toWon(targetAmount);
      const required = requiredMonthlyContribution({
        current,
        target,
        annualRate,
        years,
      });
      const noReturnRequired = Math.max(
        0,
        (target - current) / Math.max(1, years * 12)
      );

      return {
        headline: `월 ${formatManwon(required)}`,
        rows: [
          ['현재 자산', formatWon(current)],
          ['목표금액', formatWon(target)],
          ['수익률 0%일 때', `월 ${formatWon(noReturnRequired)}`],
          ['예상수익률 반영', `월 ${formatWon(required)}`],
        ],
      };
    }

    if (calculator === 'dividend-calc') {
      const investment = toWon(initialAmount);
      const gross = investment * (dividendYield / 100);
      const tax = gross * (dividendTaxRate / 100);
      const net = gross - tax;

      return {
        headline: `월평균 ${formatManwon(net / 12)}`,
        rows: [
          ['세전 연간 배당', formatWon(gross)],
          ['예상 세금', `- ${formatWon(tax)}`],
          ['세후 연간 배당', formatWon(net)],
          ['세후 월평균', formatWon(net / 12)],
        ],
      };
    }

    if (calculator === 'savings-rate-calc') {
      const income = toWon(monthlyIncome);
      const expense = toWon(monthlyExpense);
      const savings = income - expense;
      const rate = income > 0 ? (savings / income) * 100 : 0;

      return {
        headline: `${rate.toFixed(1)}%`,
        rows: [
          ['월 실수령액', formatWon(income)],
          ['월 총지출', formatWon(expense)],
          ['월 저축 가능액', formatWon(savings)],
          ['저축률', `${rate.toFixed(1)}%`],
        ],
      };
    }

    if (calculator === 'emergency-fund-calc') {
      const expense = toWon(monthlyExpense);
      const current = toWon(currentReserve);
      const target = expense * targetMonths;
      const coveredMonths = expense > 0 ? current / expense : 0;

      return {
        headline: formatManwon(target),
        rows: [
          ['현재 비상금', formatWon(current)],
          ['현재 버틸 수 있는 기간', `${coveredMonths.toFixed(1)}개월`],
          ['목표 비상금', formatWon(target)],
          ['추가 필요금액', formatWon(Math.max(0, target - current))],
        ],
      };
    }

    if (calculator === 'deposit-interest-calc') {
      const principal = toWon(initialAmount);
      const grossInterest = principal * (annualRate / 100) * years;
      const tax = grossInterest * (interestTaxRate / 100);
      const netInterest = grossInterest - tax;

      return {
        headline: formatWon(principal + netInterest),
        rows: [
          ['예치 원금', formatWon(principal)],
          ['세전 이자', formatWon(grossInterest)],
          ['예상 세금', `- ${formatWon(tax)}`],
          ['세후 만기금액', formatWon(principal + netInterest)],
        ],
      };
    }

    if (calculator === 'debt-payoff-calc') {
      const principal = toWon(initialAmount);
      const payment = toWon(monthlyAmount);
      const monthlyRate = annualRate / 100 / 12;
      const firstInterest = principal * monthlyRate;

      if (payment <= firstInterest && principal > 0) {
        return {
          headline: '상환액 조정 필요',
          rows: [
            ['대출 잔액', formatWon(principal)],
            ['첫 달 예상 이자', formatWon(firstInterest)],
            ['현재 월 상환액', formatWon(payment)],
            ['필요 조건', '월 상환액이 이자보다 커야 합니다'],
          ],
        };
      }

      const months =
        monthlyRate === 0
          ? Math.ceil(principal / Math.max(1, payment))
          : Math.ceil(
              -Math.log(1 - (monthlyRate * principal) / payment) /
                Math.log(1 + monthlyRate)
            );
      const totalPayment = payment * Math.max(0, months);

      return {
        headline: `${Math.floor(months / 12)}년 ${months % 12}개월`,
        rows: [
          ['대출 잔액', formatWon(principal)],
          ['월 상환액', formatWon(payment)],
          ['예상 상환기간', `${months}개월`],
          ['예상 총이자', formatWon(Math.max(0, totalPayment - principal))],
        ],
      };
    }

    if (calculator === 'investment-return-calc') {
      const principal = toWon(initialAmount);
      const value = toWon(currentValue);
      const profit = value - principal;
      const returnRate = principal > 0 ? (profit / principal) * 100 : 0;

      return {
        headline: `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`,
        rows: [
          ['순투자원금', formatWon(principal)],
          ['현재 평가액', formatWon(value)],
          ['평가손익', formatWon(profit)],
          ['단순 수익률', `${returnRate.toFixed(2)}%`],
        ],
      };
    }

    if (calculator === 'loss-recovery-calc') {
      const safeLossRate = Math.min(99.99, Math.max(0, lossRate));
      const principal = toWon(initialAmount);
      const current = principal * (1 - safeLossRate / 100);
      const requiredRate = (safeLossRate / (100 - safeLossRate)) * 100;

      return {
        headline: `+${requiredRate.toFixed(2)}% 필요`,
        rows: [
          ['최초 원금', formatWon(principal)],
          ['손실 후 금액', formatWon(current)],
          ['회복 필요금액', formatWon(principal - current)],
          ['본전 필요수익률', `${requiredRate.toFixed(2)}%`],
        ],
      };
    }

    if (calculator === 'cagr-calc') {
      const start = toWon(initialAmount);
      const end = toWon(targetAmount);
      const cagr =
        start > 0 && years > 0
          ? (Math.pow(end / start, 1 / years) - 1) * 100
          : 0;

      return {
        headline: `연 ${cagr.toFixed(2)}%`,
        rows: [
          ['시작금액', formatWon(start)],
          ['종료금액', formatWon(end)],
          ['투자기간', `${years}년`],
          ['연평균 복리성장률', `${cagr.toFixed(2)}%`],
        ],
      };
    }

    if (calculator === 'position-size-calc') {
      const account = toWon(initialAmount);
      const riskBudget = account * (riskPercent / 100);
      const riskPerUnit = Math.abs(entryPrice - stopPrice);
      const quantity =
        riskPerUnit > 0 ? Math.floor(riskBudget / riskPerUnit) : 0;
      const positionValue = quantity * entryPrice;

      return {
        headline: `${quantity.toLocaleString('ko-KR')}주`,
        rows: [
          ['계좌 허용손실', formatWon(riskBudget)],
          ['1주당 위험금액', formatWon(riskPerUnit)],
          ['최대 매수수량', `${quantity.toLocaleString('ko-KR')}주`],
          ['예상 포지션 금액', formatWon(positionValue)],
        ],
      };
    }

    if (calculator === 'retirement-calc') {
      const projected = futureValue({
        initial: toWon(initialAmount),
        monthly: toWon(monthlyAmount),
        annualRate,
        years,
      });
      const required =
        withdrawalRate > 0
          ? (toWon(retirementExpense) * 12) / (withdrawalRate / 100)
          : 0;

      return {
        headline: formatManwon(projected),
        rows: [
          ['예상 은퇴자산', formatWon(projected)],
          ['목표 월생활비', formatWon(toWon(retirementExpense))],
          ['목표 필요자금', formatWon(required)],
          ['예상 부족액', formatWon(Math.max(0, required - projected))],
        ],
      };
    }

    if (calculator === 'inflation-calc') {
      const current = toWon(initialAmount);
      const future = current * Math.pow(1 + inflationRate / 100, years);
      const purchasingPower = current / Math.pow(1 + inflationRate / 100, years);

      return {
        headline: formatManwon(future),
        rows: [
          ['현재 비용', formatWon(current)],
          ['예상 물가상승률', `${inflationRate.toFixed(1)}%`],
          [`${years}년 뒤 필요금액`, formatWon(future)],
          ['현재 돈의 미래 구매력', formatWon(purchasingPower)],
        ],
      };
    }

    const oldCost = currentShares * currentAverage;
    const newCost = newShares * newPrice;
    const totalShares = currentShares + newShares;
    const totalCost = oldCost + newCost;
    const newAverage =
      totalShares > 0 ? totalCost / totalShares : 0;

    return {
      headline: `${Math.round(newAverage).toLocaleString('ko-KR')}원`,
      rows: [
        ['총 보유 수량', `${totalShares.toLocaleString('ko-KR')}주`],
        ['기존 매입금', formatWon(oldCost)],
        ['추가 매입금', formatWon(newCost)],
        ['새 평균단가', formatWon(newAverage)],
      ],
    };
  }, [
    calculator,
    initialAmount,
    monthlyAmount,
    annualRate,
    years,
    targetAmount,
    dividendYield,
    dividendTaxRate,
    currentShares,
    currentAverage,
    newShares,
    newPrice,
    monthlyIncome,
    monthlyExpense,
    currentReserve,
    targetMonths,
    interestTaxRate,
    currentValue,
    lossRate,
    riskPercent,
    entryPrice,
    stopPrice,
    retirementExpense,
    withdrawalRate,
    inflationRate,
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Breadcrumbs
          items={[
            { name: '홈', href: '/' },
            { name: 'Money Hub', href: '/money' },
            { name: definition.shortTitle, href: `/money/${definition.slug}` },
          ]}
          className="mb-5"
        />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${colors.badge}`}
            >
              {definition.category} · {definition.badge}
            </span>
            <p className="mt-3 text-[11px] font-black tracking-[0.16em] text-slate-400">
              {definition.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              {definition.shortTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {definition.description}
            </p>
          </div>

          <ShareButton />
        </div>

        <section className="mb-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {calculator === 'compound-calc' && (
            <>
              <NumberField label="초기 투자금" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="매월 추가 투자금" value={monthlyAmount} onChange={setMonthlyAmount} unit="만 원" step={10} />
              <NumberField label="예상 연 수익률" value={annualRate} onChange={setAnnualRate} unit="%" max={100} step={0.1} />
              <NumberField label="투자 기간" value={years} onChange={setYears} unit="년" min={1} max={60} />
            </>
          )}

          {calculator === 'monthly-investment-calc' && (
            <>
              <NumberField label="매월 투자금" value={monthlyAmount} onChange={setMonthlyAmount} unit="만 원" step={10} />
              <NumberField label="예상 연 수익률" value={annualRate} onChange={setAnnualRate} unit="%" max={100} step={0.1} />
              <NumberField label="집중해서 볼 기간" value={years} onChange={setYears} unit="년" min={1} max={60} />
            </>
          )}

          {calculator === 'goal-calc' && (
            <>
              <NumberField label="현재 모은 금액" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="목표금액" value={targetAmount} onChange={setTargetAmount} unit="만 원" step={1000} />
              <NumberField label="목표 기간" value={years} onChange={setYears} unit="년" min={1} max={60} />
              <NumberField label="예상 연 수익률" value={annualRate} onChange={setAnnualRate} unit="%" max={100} step={0.1} />
            </>
          )}

          {calculator === 'dividend-calc' && (
            <>
              <NumberField label="투자금" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="예상 배당수익률" value={dividendYield} onChange={setDividendYield} unit="%" max={100} step={0.1} />
              <NumberField label="예상 원천징수율" value={dividendTaxRate} onChange={setDividendTaxRate} unit="%" max={100} step={0.1} />
            </>
          )}

          {calculator === 'average-price-calc' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="기존 보유 수량" value={currentShares} onChange={setCurrentShares} unit="주" />
                <NumberField label="기존 평균단가" value={currentAverage} onChange={setCurrentAverage} unit="원" step={100} />
                <NumberField label="추가 매수 수량" value={newShares} onChange={setNewShares} unit="주" />
                <NumberField label="추가 매수 가격" value={newPrice} onChange={setNewPrice} unit="원" step={100} />
              </div>
            </>
          )}

          {calculator === 'savings-rate-calc' && (
            <>
              <NumberField label="월 실수령액" value={monthlyIncome} onChange={setMonthlyIncome} unit="만 원" step={10} />
              <NumberField label="월 총지출" value={monthlyExpense} onChange={setMonthlyExpense} unit="만 원" step={10} />
            </>
          )}

          {calculator === 'emergency-fund-calc' && (
            <>
              <NumberField label="월 필수생활비" value={monthlyExpense} onChange={setMonthlyExpense} unit="만 원" step={10} />
              <NumberField label="현재 비상금" value={currentReserve} onChange={setCurrentReserve} unit="만 원" step={50} />
              <NumberField label="목표 기간" value={targetMonths} onChange={setTargetMonths} unit="개월" min={1} max={36} />
            </>
          )}

          {calculator === 'deposit-interest-calc' && (
            <>
              <NumberField label="예치 원금" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="연 이자율" value={annualRate} onChange={setAnnualRate} unit="%" max={30} step={0.1} />
              <NumberField label="예치 기간" value={years} onChange={setYears} unit="년" min={0.1} max={30} step={0.1} />
              <NumberField label="예상 세율" value={interestTaxRate} onChange={setInterestTaxRate} unit="%" max={100} step={0.1} />
            </>
          )}

          {calculator === 'debt-payoff-calc' && (
            <>
              <NumberField label="현재 대출잔액" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="연 이자율" value={annualRate} onChange={setAnnualRate} unit="%" max={100} step={0.1} />
              <NumberField label="매월 상환액" value={monthlyAmount} onChange={setMonthlyAmount} unit="만 원" step={10} />
            </>
          )}

          {calculator === 'investment-return-calc' && (
            <>
              <NumberField label="순투자원금" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="현재 평가액" value={currentValue} onChange={setCurrentValue} unit="만 원" step={100} />
            </>
          )}

          {calculator === 'loss-recovery-calc' && (
            <>
              <NumberField label="최초 투자원금" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="현재 손실률" value={lossRate} onChange={setLossRate} unit="%" max={99.99} step={0.1} />
            </>
          )}

          {calculator === 'cagr-calc' && (
            <>
              <NumberField label="시작금액" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="종료금액" value={targetAmount} onChange={setTargetAmount} unit="만 원" step={100} />
              <NumberField label="투자 기간" value={years} onChange={setYears} unit="년" min={0.1} max={100} step={0.1} />
            </>
          )}

          {calculator === 'position-size-calc' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField label="계좌금액" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="최대 위험률" value={riskPercent} onChange={setRiskPercent} unit="%" max={100} step={0.1} />
              <NumberField label="진입가격" value={entryPrice} onChange={setEntryPrice} unit="원" step={100} />
              <NumberField label="손절가격" value={stopPrice} onChange={setStopPrice} unit="원" step={100} />
            </div>
          )}

          {calculator === 'retirement-calc' && (
            <>
              <NumberField label="현재 은퇴자산" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="매월 저축액" value={monthlyAmount} onChange={setMonthlyAmount} unit="만 원" step={10} />
              <NumberField label="은퇴까지 기간" value={years} onChange={setYears} unit="년" min={1} max={60} />
              <NumberField label="예상 연 수익률" value={annualRate} onChange={setAnnualRate} unit="%" max={100} step={0.1} />
              <NumberField label="은퇴 후 월생활비" value={retirementExpense} onChange={setRetirementExpense} unit="만 원" step={10} />
              <NumberField label="가정 인출률" value={withdrawalRate} onChange={setWithdrawalRate} unit="%" min={0.1} max={20} step={0.1} />
            </>
          )}

          {calculator === 'inflation-calc' && (
            <>
              <NumberField label="현재 필요한 금액" value={initialAmount} onChange={setInitialAmount} unit="만 원" step={100} />
              <NumberField label="예상 물가상승률" value={inflationRate} onChange={setInflationRate} unit="%" max={100} step={0.1} />
              <NumberField label="기간" value={years} onChange={setYears} unit="년" min={1} max={100} />
            </>
          )}
        </section>

        <section
          className={`mb-6 rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg ${colors.result}`}
        >
          <p className="text-sm font-bold text-white/80">
            계산 결과
          </p>
          <p className="mt-2 break-words text-3xl font-black text-yellow-200">
            {calculation.headline}
          </p>

          <div className="mt-5 border-t border-white/20 pt-2">
            {calculation.rows.map(([label, value], index) => (
              <ResultRow
                key={label}
                label={label}
                value={value}
                emphasize={index === calculation.rows.length - 1}
              />
            ))}
          </div>
        </section>

        <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          {guide && (
            <section>
              <h2 className="text-lg font-black text-slate-900">
                {definition.shortTitle}는 언제 사용하나요?
              </h2>
              <p className="mt-2">{guide.summary}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {guide.useCases.map((useCase) => (
                  <li key={useCase}>{useCase}</li>
                ))}
              </ul>
              <div className={`mt-4 rounded-2xl border p-4 ${colors.soft}`}>
                <h3 className="font-black">간단한 계산 예시</h3>
                <p className="mt-2 text-xs leading-6">{guide.example}</p>
              </div>
              <h3 className="mt-5 font-black text-slate-900">결과 해석 방법</h3>
              <p className="mt-2">{guide.interpretation}</p>
            </section>
          )}

          <section className={`rounded-2xl border p-4 ${colors.soft}`}>
            <h2 className="font-black">
              계산 결과를 볼 때 꼭 확인하세요
            </h2>
            <p className="mt-2 text-xs leading-6">
              이 결과는 입력한 조건을 단순 적용한 예상치입니다. 실제 세금·수수료·금리·물가·시장 변동과 개인 조건에 따라 달라질 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">
              숫자는 계획을 세우는 출발점입니다
            </h2>
            <p className="mt-2">
              계산값 하나를 정답으로 보기보다 현재 조건과 보수적인 조건을 나란히 비교하세요. 금액·기간·금리 또는 수익률 중 한 번에 하나만 바꾸면 어떤 조건이 결과에 큰 영향을 주는지 더 쉽게 판단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">
              계산 기준
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>복리·적립식·목표금액은 월 단위 복리 가정</li>
              <li>매월 투자금은 월말 납입 가정</li>
              <li>배당금은 입력한 원천징수율을 단순 적용</li>
              <li>평균단가는 매매수수료와 제세금을 제외한 가중평균</li>
              <li>예금이자는 단리, 빚 상환은 매월 정액상환을 가정</li>
              <li>은퇴자금과 물가 결과는 입력값이 유지된다는 단순 가정</li>
            </ul>
          </section>
        </article>

        <RelatedMoneyTools tools={relatedTools} />
      </div>
    </main>
  );
}
