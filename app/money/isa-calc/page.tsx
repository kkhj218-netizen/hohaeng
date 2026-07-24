'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/app/components/ShareButton';
import RelatedArticles from '@/app/components/RelatedArticles';

export default function IsaCalcPage() {
  const [amount, setAmount] = useState<number>(1000);
  const [years, setYears] = useState<number>(3);
  const [rate, setRate] = useState<number>(5);

  const totalProfit = Math.round(amount * (rate / 100) * years);
  const generalTax = Math.round(totalProfit * 0.154);
  const isaTax = totalProfit > 200 ? Math.round((totalProfit - 200) * 0.099) : 0;
  const savedTax = generalTax - isaTax;

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
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">ISA 절세 효과 계산기</h1>
            <p className="text-sm text-slate-500 mt-1">투자 금액과 기간에 따른 절세 혜택을 3초 만에 계산해보세요.</p>
          </div>
          <ShareButton />
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

        {/* SEO 콘텐츠 영역 */}
        <article className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-700 space-y-6 mb-8">
          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              💡 ISA(개인종합자산관리계좌)란 무엇인가요?
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              ISA는 예금, 펀드, ETF, 국내 주식 등 다양한 금융상품을 하나의 계좌에서 운용하면서 발생한 수익에 대해 **비과세 및 저율 분리과세 혜택**을 제공하는 만능 절세 계좌입니다. 재테크를 시작하는 직장인과 투자자에게 선택이 아닌 필수 금융 상품입니다.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-2">
              🔥 ISA 계좌의 3가지 핵심 절세 혜택
            </h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 leading-relaxed">
              <li>
                <strong className="text-slate-800">최대 400만원 비과세:</strong> 일반형은 200만원, 서민형은 최대 400만원까지 발생한 순수익에 대해 세금이 전혀 부과되지 않습니다.
              </li>
              <li>
                <strong className="text-slate-800">9.9% 분리과세:</strong> 비과세 한도를 초과한 수익에 대해서도 일반 배당소득세(15.4%)가 아닌 9.9% 저율 과세가 적용됩니다.
              </li>
              <li>
                <strong className="text-slate-800">손익통산 혜택:</strong> 이익이 난 상품과 손실이 난 상품을 합산하여 '최종 순수익'에 대해서만 세금을 계산하므로 세금 부담이 획기적으로 줄어듭니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-extrabold text-lg text-slate-900 mb-3">
              ❓ 자주 묻는 질문 (FAQ)
            </h2>
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 의무 가입 기간 3년을 채우지 못하고 해지하면 어떻게 되나요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  3년 이내에 중도 해지할 경우 그동안 받은 비과세 및 절세 혜택이 소멸되고 일반 배당소득세(15.4%)가 추징됩니다. 단, 원금 범위 내에서는 중도 인출하더라도 혜택이 유지됩니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. 일반형과 서민형의 차이는 무엇인가요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  직전 연도 총급여 5,000만 원 이하(종합소득 3,800만 원 이하)인 경우 서민형으로 가입 가능하며, 비과세 한도가 일반형(200만 원)의 2배인 400만 원까지 확대됩니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800">Q. ISA 만기 후 연금저축으로 이전하면 좋은가요?</h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  ISA 만기 자금을 연금저축이나 IRP로 전환할 경우, 전환 금액의 10%(최대 300만 원)까지 추가 세액공제 혜택을 받을 수 있어 절세 효과를 극대화할 수 있습니다.
                </p>
              </div>
            </div>
          </section>
        </article>

        {/* 💡 관련 아티클 추천 영역 연동 */}
        <RelatedArticles category="isa" />
      </div>
    </main>
  );
}