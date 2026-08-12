'use client';

import { useState } from 'react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import RelatedMoneyTools from '@/app/components/RelatedMoneyTools';
import ShareButton from '@/app/components/ShareButton';
import { getRelatedTools } from '@/app/money/relatedTools';

/*
 * 2026년 근로소득 간이세액표
 * 공제대상가족 1명(본인 포함), 원천징수 100% 기준
 *
 * 연봉 2,000만 원부터 1억 5,000만 원까지
 * 100만 원 간격의 월 근로소득세
 */
const INCOME_TAX_2026_ONE_PERSON = [
  12220, 14080, 15730, 17390, 19520, 22090, 24660, 27560, 30130, 32700,
  35600, 38340, 44820, 52530, 59370, 66220, 74350, 81190, 88040, 95430,
  105210, 114990, 127220, 137000, 146780, 156560, 171930, 182610, 195960,
  206640, 217320, 228000, 238680, 249360, 262840, 276560, 287780, 299000,
  310220, 321440, 335470, 346690, 357910, 369130, 380350, 391570, 405590,
  416810, 428030, 439250, 450470, 483220, 505900, 524050, 542190, 560340,
  578480, 596620, 619300, 637450, 655590, 673740, 691880, 710020, 732700,
  750850, 768990, 787140, 805280, 823420, 846100, 864250, 882390, 900540,
  918680, 936820, 959500, 977650, 995790, 1013940, 1032080, 1050780,
  1074180, 1092900, 1111620, 1130340, 1149060, 1167780, 1191180,
  1209900, 1228620, 1251470, 1278770, 1306070, 1340190, 1367490,
  1394790, 1422090, 1449390, 1476690, 1507400, 1560980, 1589560,
  1618150, 1646730, 1675310, 1703900, 1732480, 1761060, 1789650,
  1818230, 1846810, 1875400, 1903980, 1932560, 1961150, 1989730,
  2018310, 2046900, 2075480, 2104060, 2132650, 2161230, 2189810,
  2218400, 2246980, 2275560, 2304150, 2332730, 2361310, 2389900,
];

/* 10원 미만 절사 */
function floorToTen(value: number) {
  return Math.floor(value / 10) * 10;
}

export default function SalaryCalcPage() {
  const [annualSalary, setAnnualSalary] = useState<number>(4000);
  const relatedTools = getRelatedTools('salary-calc');

  /* 연봉은 만 원 단위 */
  const monthlyGross = Math.round((annualSalary * 10000) / 12);

  /*
   * 국민연금
   * 2026년 근로자 부담률 4.75%
   * 2026년 7월 이후 기준소득월액:
   * 하한 41만 원 / 상한 659만 원
   */
  const nationalPensionBase = Math.min(
    Math.max(Math.floor(monthlyGross / 1000) * 1000, 410000),
    6590000
  );

  const nationalPension = floorToTen(
    nationalPensionBase * 0.0475
  );

  /*
   * 건강보험
   * 전체 7.19% 중 근로자 부담 3.595%
   */
  const healthInsurance = floorToTen(
    monthlyGross * 0.03595
  );

  /*
   * 장기요양보험
   * 건강보험료 × 0.9448% ÷ 7.19%
   */
  const longTermCare = floorToTen(
    healthInsurance * (0.009448 / 0.0719)
  );

  /*
   * 고용보험
   * 근로자 부담 0.9%
   */
  const employmentInsurance = floorToTen(
    monthlyGross * 0.009
  );

  /*
   * 2026년 근로소득 간이세액표
   * 공제대상가족 1명, 비과세 금액 없음 기준
   */
  const incomeTaxIndex = Math.round(
    (annualSalary - 2000) / 100
  );

  const safeIncomeTaxIndex = Math.min(
    Math.max(incomeTaxIndex, 0),
    INCOME_TAX_2026_ONE_PERSON.length - 1
  );

  const incomeTax =
    INCOME_TAX_2026_ONE_PERSON[safeIncomeTaxIndex];

  /* 지방소득세: 근로소득세의 10% */
  const localTax = floorToTen(incomeTax * 0.1);

  const totalDeduction =
    nationalPension +
    healthInsurance +
    longTermCare +
    employmentInsurance +
    incomeTax +
    localTax;

  const monthlyNet = Math.max(
    0,
    monthlyGross - totalDeduction
  );

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <Breadcrumbs
          items={[
            { name: '홈', href: '/' },
            { name: 'Money Hub', href: '/money' },
            { name: '연봉 실수령액 계산기', href: '/money/salary-calc' },
          ]}
          className="mb-5"
        />

        {/* 타이틀 및 공유 버튼 */}
        <div className="mb-6 flex justify-between items-start gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Money OS
            </span>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
              2026년 연봉 실수령액 계산기
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              4대 보험과 세금을 공제한 예상 월급을 확인하세요.
            </p>
          </div>

          <ShareButton />
        </div>

        {/* 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              희망·현재 연봉(세전)
            </label>

            <div className="text-blue-600 font-extrabold text-xl mb-3">
              {annualSalary.toLocaleString()}만 원
            </div>

            <input
              type="range"
              min="2000"
              max="15000"
              step="100"
              value={annualSalary}
              onChange={(e) =>
                setAnnualSalary(Number(e.target.value))
              }
              className="w-full accent-blue-600 cursor-pointer"
              aria-label="연봉 선택"
            />

            <div className="flex justify-between text-[11px] text-slate-400 mt-2">
              <span>2,000만 원</span>
              <span>1억 5,000만 원</span>
            </div>
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-2xl shadow-md mb-8">
          <div className="text-sm opacity-90 font-medium">
            월 예상 실수령액
          </div>

          <div className="text-3xl font-black mt-1 mb-4 text-yellow-300">
            약{' '}
            {Math.round(
              monthlyNet / 10000
            ).toLocaleString()}
            만 원
          </div>

          <div className="text-sm text-white/80 mb-4">
            {monthlyNet.toLocaleString()}원
          </div>

          <div className="border-t border-white/20 pt-3 text-xs space-y-1.5 opacity-90">
            <div className="flex justify-between">
              <span>월 세전 금액</span>
              <span className="font-bold">
                {monthlyGross.toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between text-yellow-200">
              <span>총 월 공제액</span>
              <span className="font-bold">
                - {totalDeduction.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 공제 세부 내역 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 mb-8 space-y-2 text-xs text-slate-600">
          <h2 className="font-bold text-slate-900 text-sm mb-3">
            📋 월 예상 공제 항목
          </h2>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>국민연금(근로자 4.75%)</span>
            <span className="font-medium text-slate-800">
              {nationalPension.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>건강보험(근로자 3.595%)</span>
            <span className="font-medium text-slate-800">
              {healthInsurance.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>장기요양보험</span>
            <span className="font-medium text-slate-800">
              {longTermCare.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>고용보험(0.9%)</span>
            <span className="font-medium text-slate-800">
              {employmentInsurance.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>근로소득세(간이세액표)</span>
            <span className="font-medium text-slate-800">
              {incomeTax.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span>지방소득세(10%)</span>
            <span className="font-medium text-slate-800">
              {localTax.toLocaleString()}원
            </span>
          </div>

          <div className="bg-amber-50 text-amber-800 p-3 rounded-xl mt-4 leading-relaxed">
            공제대상가족 1명, 원천징수 100%, 비과세 금액이
            없는 경우를 기준으로 계산한 예상치입니다.
          </div>
        </div>

        {/* SEO 콘텐츠 */}
        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              💡 계약 연봉과 실수령액이 다른 이유
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              근로계약서에 적힌 연봉을 12개월로 나눈 금액이
              그대로 입금되는 것은 아닙니다. 월급을 지급하기
              전에{' '}
              <strong>
                국민연금, 건강보험, 장기요양보험, 고용보험
              </strong>
              과{' '}
              <strong>
                근로소득세·지방소득세
              </strong>
              가 먼저 공제되기 때문입니다.
            </p>
          </section>

          <section className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h2 className="font-bold text-blue-900 text-sm mb-2">
              2026년 계산 기준
            </h2>

            <ul className="text-xs text-blue-800 leading-relaxed space-y-1">
              <li>• 국민연금 근로자 부담률 4.75%</li>
              <li>• 건강보험 근로자 부담률 3.595%</li>
              <li>• 장기요양보험료율 0.9448%</li>
              <li>• 고용보험 근로자 부담률 0.9%</li>
              <li>• 공제대상가족 1명 기준 간이세액표</li>
            </ul>

            <p className="text-[11px] text-blue-700 mt-3 leading-relaxed">
              국민연금 기준소득월액 상한 659만 원은
              2026년 7월 1일 이후 기준입니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-3">
              ❓ 자주 묻는 질문
            </h2>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">
                  Q. 부양가족 수에 따라 달라지나요?
                </h3>

                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  네. 공제대상 배우자나 자녀가 있다면
                  근로소득 간이세액표의 세금이 달라질 수
                  있습니다. 현재 계산기는 본인만 포함한
                  공제대상가족 1명 기준입니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">
                  Q. 식대 비과세가 포함되면 어떻게 되나요?
                </h3>

                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  월 20만 원 한도의 식대처럼 비과세 항목이
                  있다면 과세 대상 월급이 줄어 실제
                  실수령액은 계산 결과보다 높아질 수 있습니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">
                  Q. 실제 급여명세서와 금액이 다른 이유는 무엇인가요?
                </h3>

                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  회사가 신고한 기준소득월액, 상여금, 비과세
                  수당, 부양가족, 원천징수 비율, 중도 입사
                  여부에 따라 실제 공제액은 달라질 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h2 className="font-bold text-sm text-slate-900 mb-2">
              공식 자료
            </h2>

            <div className="flex flex-col gap-2 text-xs">
              <a
                href="https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0038M0.do"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                국민연금공단 보험료율·기준소득월액
              </a>

              <a
                href="https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                국민건강보험공단 2026년 보험료율
              </a>

              <a
                href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7862&mi=6583"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                국세청 근로소득 간이세액표 안내
              </a>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              확인 기준일: 2026년 8월 4일
            </p>
          </section>
        </article>

        <RelatedMoneyTools tools={relatedTools} />
      </div>
    </main>
  );
}
