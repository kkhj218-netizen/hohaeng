"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CopyTextButton from "@/app/components/CopyTextButton";
import { supabase } from "@/app/lib/supabase";

const BASE = "https://hohaeng.vercel.app/start";

const CHANNELS = [
  {
    key: "instagram",
    name: "Instagram",
    emoji: "📸",
    role: "시각적 발견 → 프로필 링크 클릭",
    cadence: "피드/릴스 주 4~5회 + 스토리 일상적으로",
    link: `${BASE}?utm_source=instagram&utm_medium=social&utm_campaign=hohaeng_os`,
    format: `1장: “오늘 시장에서 딱 하나만 보면?”처럼 질문/숫자 훅\n2장: 실제 데이터 변화 1개\n3장: 과거 비슷했던 사례 또는 비교\n4장: 한 줄 해석\n5장: “원본 데이터는 프로필 링크 → 호행처럼”\n\n캡션은 결론을 다 주기보다 ‘왜 그런지’ 3~5문장 + 프로필 링크 CTA.`,
  },
  {
    key: "threads",
    name: "Threads",
    emoji: "🧵",
    role: "대화·관점 → 궁금증 → 데이터 확인",
    cadence: "하루 1~2개 + 댓글/답글 적극 운영",
    link: `${BASE}?utm_source=threads&utm_medium=social&utm_campaign=hohaeng_os`,
    format: `첫 문장: “CPI가 내려오면 나스닥은 정말 오를까?” 같은 질문\n둘째: 오늘 숫자/상황\n셋째: 과거 사례 한 줄\n넷째: 내 생각 또는 질문\n마지막: “과거 데이터는 호행처럼에서 직접 확인”\n\nThreads에서는 링크보다 대화가 먼저. 댓글에서 질문을 받은 뒤 관련 데이터 페이지를 연결.`,
  },
  {
    key: "x",
    name: "X",
    emoji: "𝕏",
    role: "빠른 데이터 → 원본/세부 데이터 클릭",
    cadence: "시장일 기준 하루 2~4개 짧은 데이터 포스트",
    link: `${BASE}?utm_source=x&utm_medium=social&utm_campaign=hohaeng_os`,
    format: `① 오늘 바뀐 숫자 1개\n② 왜 볼 만한지 1문장\n③ 과거 유사사례 통계 1개\n④ 원본 링크\n\n예) Core PCE 2.8% → 2.6%.\n과거 비슷한 둔화 사례 TOP10에서 NQ +5D 상승 7/10.\n평균이 아니라 분포까지 확인: [호행처럼 링크]`,
  },
] as const;

const CONTENT_PILLARS = [
  ["A. 오늘 데이터", "전일 미국시장 마감, VIX·금리·달러, 오늘 발표 일정. 가장 자주 발행."],
  ["B. 이벤트", "CPI/PCE 발표 전후, 과거 유사사례, 시장환경, Cross Asset 반응."],
  ["C. 이상 신호", "평소와 다른 자산 조합, 극단 백분위, 변동성 확대처럼 스크롤을 멈추게 하는 소재."],
  ["D. 복기", "‘발표 전에 이렇게 봤는데 실제로는 어땠나?’를 공개해 신뢰를 쌓는 콘텐츠."],
  ["E. 호행의 판단", "데이터를 본 뒤의 개인 생각. 추천이 아니라 어떤 근거를 중요하게 보는지 보여주는 브랜딩."],
] as const;

export default function SocialFunnelAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  const commonBio = useMemo(
    () => "시장 데이터를 모아 ‘과거 비슷했을 때 실제로 어땠는지’ 확인합니다. 매수·매도 추천보다 판단할 데이터를 정리합니다. ↓ TODAY / EVENT DB",
    [],
  );

  if (!ready) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-400">SNS 운영센터 확인 중...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-20 text-slate-950">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">HOHAENG SOCIAL FUNNEL OS</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">인스타 · Threads · X 퍼널 운영센터</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            SNS에서 관심을 만들고, `/start`에서 처음 방문자를 안내한 뒤, TODAY와 EVENT DB를 체험시키고 PWA 저장까지 연결합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/start" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">기본 랜딩 보기 →</Link>
            <Link href="/today" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white">TODAY →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">PROFILE BIO</p>
              <h2 className="mt-1 text-2xl font-black">세 채널에서 같은 브랜드 문장 사용</h2>
            </div>
            <CopyTextButton text={commonBio} label="소개문 복사" />
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{commonBio}</p>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">CHANNEL ROLE</p>
            <h2 className="mt-1 text-2xl font-black">같은 글을 세 군데 복붙하지 않기</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {CHANNELS.map((channel) => (
              <article key={channel.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl">{channel.emoji}</p>
                    <h3 className="mt-2 text-xl font-black">{channel.name}</h3>
                    <p className="mt-1 text-xs font-bold text-blue-600">{channel.role}</p>
                  </div>
                  <CopyTextButton text={channel.link} label="UTM 링크" />
                </div>
                <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">권장 빈도 · {channel.cadence}</p>
                <div className="mt-4 whitespace-pre-line rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-300">{channel.format}</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] text-slate-400">{channel.link}</p>
                  <CopyTextButton text={channel.format} label="포맷 복사" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">CONTENT PILLARS</p>
            <h2 className="mt-1 text-2xl font-black">소재는 5개 축만 반복</h2>
            <div className="mt-5 space-y-3">
              {CONTENT_PILLARS.map(([title, detail]) => (
                <div key={title} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-black">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">DAILY LOOP</p>
            <h2 className="mt-1 text-2xl font-black">하루 운영은 이 정도로 끝</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <div><strong className="text-white">① 오전 10분</strong><br />TODAY에서 오늘 쓸 숫자 1~2개 선택.</div>
              <div><strong className="text-white">② X 5분</strong><br />숫자 + 과거 비교 + 원본 링크로 빠르게 배포.</div>
              <div><strong className="text-white">③ Threads 10분</strong><br />같은 소재를 질문/생각 중심으로 바꾸고 댓글 대화.</div>
              <div><strong className="text-white">④ Instagram 15~20분</strong><br />하루 핵심 소재 하나만 카드/릴스로 시각화.</div>
              <div><strong className="text-white">⑤ 주 1회 10분</strong><br />GA4에서 instagram / threads / x 유입과 PWA 설치 클릭 비교.</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">4-WEEK TEST</p>
          <h2 className="mt-1 text-2xl font-black">처음 4주는 팔로워보다 퍼널 전환을 본다</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1주", "각 채널 포맷 고정", "조회수보다 어떤 주제에서 프로필/링크 클릭이 나오는지 확인"],
              ["2주", "훅 A/B", "숫자형 훅 vs 질문형 훅 비교"],
              ["3주", "CTA A/B", "‘원본 보기’ vs ‘과거 사례 보기’ 클릭률 비교"],
              ["4주", "PWA 전환", "SNS별 /start 유입 대비 설치 클릭이 가장 높은 채널 집중"],
            ].map(([week, title, detail]) => (
              <div key={week} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-black text-amber-700">{week}</p>
                <p className="mt-1 text-sm font-black">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
