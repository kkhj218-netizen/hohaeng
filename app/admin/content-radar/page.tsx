"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import CopyTextButton from "@/app/components/CopyTextButton";
import { supabase } from "@/app/lib/supabase";

type Candidate = {
  id: string;
  rank: number;
  type: "anomaly" | "big_change" | "extreme";
  title: string;
  hook: string;
  hookVariants: string[];
  summary: string;
  score: number;
  recommended: boolean;
  grade: "S" | "A" | "B" | "C";
  breakdown: {
    extremity: number;
    divergence: number;
    rarity: number;
    timeliness: number;
    importance: number;
  };
  reasons: string[];
  symbols: string[];
  sourceHref: string;
  drafts: null | {
    x: string;
    threads: string;
    instagramSlides: string[];
    instagramCaption: string;
  };
};

type Radar = {
  asOfDate: string;
  generatedAt: string;
  threshold: number;
  regime: string;
  regimeScore: number;
  recommendedCount: number;
  candidates: Candidate[];
  rule: string;
};

function gradeTone(grade: Candidate["grade"]) {
  if (grade === "S") return "border-rose-200 bg-rose-50 text-rose-700";
  if (grade === "A") return "border-violet-200 bg-violet-50 text-violet-700";
  if (grade === "B") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-500";
}

function scoreBar(value: number, max: number) {
  return `${Math.max(2, Math.min(100, (value / max) * 100))}%`;
}

const SCORE_ROWS = [
  ["극단성", "extremity", 25],
  ["이상조합", "divergence", 25],
  ["희귀도", "rarity", 20],
  ["현재성", "timeliness", 15],
  ["중요도", "importance", 15],
] as const;

export default function ContentRadarAdminPage() {
  const router = useRouter();
  const [radar, setRadar] = useState<Radar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    try {
      const response = await fetch("/api/admin/content-radar", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok: boolean; radar?: Radar | null; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setRadar(payload.radar ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Content Radar를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-20 text-slate-950">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">HOHAENG CONTENT RADAR</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">오늘 SNS에 올릴 가치가 있는 것만 고르기</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                매일 억지로 콘텐츠를 만들지 않습니다. 극단값·이상조합·희귀한 변화·현재성·중요도를 합산해 70점 이상만 초안 생성 대상으로 분류합니다.
              </p>
            </div>
            <button onClick={() => void load()} disabled={loading} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">
              {loading ? "분석 중..." : "오늘 데이터 다시 분석"}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/social-funnel" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white">SNS 퍼널 운영센터 →</Link>
            <Link href="/today" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white">TODAY 원본 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

        {!loading && !error && !radar && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-7">
            <h2 className="text-xl font-black">오늘 시장 데이터를 아직 분석할 수 없습니다.</h2>
            <p className="mt-2 text-sm text-slate-500">TODAY 데이터 수집 상태를 먼저 확인한 뒤 다시 실행해 주세요.</p>
          </div>
        )}

        {radar && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black text-slate-400">기준일</p>
                <p className="mt-2 text-2xl font-black">{radar.asOfDate}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black text-slate-400">현재 시장국면</p>
                <p className="mt-2 text-2xl font-black">{radar.regime}</p>
                <p className="mt-1 text-xs text-slate-400">점수 {radar.regimeScore}</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-black text-emerald-700">오늘 게시 추천</p>
                <p className="mt-2 text-3xl font-black text-emerald-700">{radar.recommendedCount}개</p>
                <p className="mt-1 text-xs text-emerald-700/70">{radar.threshold}점 이상</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black text-slate-400">운영 원칙</p>
                <p className="mt-2 text-sm font-black leading-6">강한 소재가 없으면 오늘은 안 올려도 됨</p>
              </div>
            </section>

            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">SCORING</p>
              <h2 className="mt-1 text-xl font-black">왜 이 소재가 강한지도 같이 본다</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900/70">{radar.rule}</p>
            </section>

            <section className="space-y-5">
              {radar.candidates.map((candidate) => (
                <article key={candidate.id} className={`overflow-hidden rounded-[28px] border bg-white shadow-sm ${candidate.recommended ? "border-emerald-200" : "border-slate-200"}`}>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-400">TOP {candidate.rank}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${gradeTone(candidate.grade)}`}>{candidate.grade} · {candidate.score}점</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${candidate.recommended ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>{candidate.recommended ? "초안 생성 대상" : "게시 비추천"}</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-black">{candidate.title}</h2>
                        <p className="mt-2 text-base font-black leading-7 text-blue-700">“{candidate.hook}”</p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{candidate.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {candidate.symbols.map((symbol) => <span key={symbol} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{symbol}</span>)}
                          <Link href={candidate.sourceHref} className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">원본 데이터 →</Link>
                        </div>
                      </div>
                      <div className="w-full rounded-2xl bg-slate-50 p-4 sm:w-72">
                        <p className="text-xs font-black text-slate-400">점수 구성</p>
                        <div className="mt-3 space-y-3">
                          {SCORE_ROWS.map(([label, key, max]) => {
                            const value = candidate.breakdown[key];
                            return (
                              <div key={key}>
                                <div className="mb-1 flex justify-between text-[11px] font-bold"><span>{label}</span><span>{value}/{max}</span></div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-900" style={{ width: scoreBar(value, max) }} /></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">WHY NOW</p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                          {candidate.reasons.length ? candidate.reasons.map((reason) => <p key={reason}>• {reason}</p>) : <p>• 현재성은 있지만 강한 극단/희귀 신호가 부족합니다.</p>}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-950 p-4 text-white">
                        <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-orange-300">HOOK A/B</p><CopyTextButton text={candidate.hookVariants.join("\n\n")} label="훅 5개 복사" /></div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                          {candidate.hookVariants.map((hook, index) => <p key={hook}><strong className="mr-2 text-white">{index + 1}.</strong>{hook}</p>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {candidate.drafts ? (
                    <div className="border-t border-emerald-100 bg-emerald-50/40 p-5 sm:p-6">
                      <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">READY TO POST</p><h3 className="mt-1 text-xl font-black">70점 이상 → 채널별 초안 생성</h3></div>
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2"><p className="font-black">𝕏 X</p><CopyTextButton text={candidate.drafts.x} label="복사" /></div>
                          <p className="mt-3 whitespace-pre-line text-xs leading-6 text-slate-600">{candidate.drafts.x}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2"><p className="font-black">🧵 Threads</p><CopyTextButton text={candidate.drafts.threads} label="복사" /></div>
                          <p className="mt-3 whitespace-pre-line text-xs leading-6 text-slate-600">{candidate.drafts.threads}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2"><p className="font-black">📸 Instagram 5장</p><CopyTextButton text={`${candidate.drafts.instagramSlides.map((slide, index) => `${index + 1}장\n${slide}`).join("\n\n")}\n\n캡션\n${candidate.drafts.instagramCaption}`} label="전체 복사" /></div>
                          <div className="mt-3 space-y-2">{candidate.drafts.instagramSlides.map((slide, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-xs leading-5"><strong>{index + 1}장</strong><br />{slide}</div>)}</div>
                          <p className="mt-3 whitespace-pre-line border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">{candidate.drafts.instagramCaption}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">70점 미만이라 초안을 만들지 않았습니다. 더 강한 소재를 기다립니다.</div>
                  )}
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
