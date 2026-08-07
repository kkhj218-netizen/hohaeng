'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import ShareButton from '@/app/components/ShareButton';
import {
  CALCULATORS,
  type CalculatorSlug,
} from '@/app/money/calculatorCatalog';

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
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link
          href="/#tools"
          className="mb-4 inline-block text-sm font-bold text-blue-600 hover:underline"
        >
          ← 계산기 목록으로 돌아가기
        </Link>

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
          <section className={`rounded-2xl border p-4 ${colors.soft}`}>
            <h2 className="font-black">
              계산 결과를 볼 때 꼭 확인하세요
            </h2>
            <p className="mt-2 text-xs leading-6">
              이 결과는 입력한 수익률이 매 기간 일정하게 유지되고 수수료·세금·가격 변동이 없다고 가정한 단순 예상치입니다. 실제 투자 성과나 배당금 지급을 보장하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">
              숫자는 계획을 세우는 출발점입니다
            </h2>
            <p className="mt-2">
              수익률을 높게 넣으면 결과는 빠르게 커지지만 현실의 시장은 매년 같은 수익을 주지 않습니다. 먼저 보수적인 수익률로 확인한 뒤 낙관적인 경우와 비교하면 목표에 필요한 저축액과 시간을 더 안전하게 판단할 수 있습니다.
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
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
