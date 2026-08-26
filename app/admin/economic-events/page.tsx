"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type CpiAdminEvent,
  type CpiMetricKey,
} from "@/app/lib/economicEventEngine";
import { supabase } from "@/app/lib/supabase";

type ApiResponse =
  | { ok: true; events: CpiAdminEvent[]; result?: unknown }
  | { ok: false; error: string };

const METRIC_KEYS: CpiMetricKey[] = [
  "headline_yoy",
  "headline_mom",
  "core_yoy",
  "core_mom",
];

function formatKst(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function metricLabel(key: CpiMetricKey) {
  if (key === "headline_yoy") return "헤드라인 YoY";
  if (key === "headline_mom") return "헤드라인 MoM";
  if (key === "core_yoy") return "근원 YoY";
  return "근원 MoM";
}

function valueText(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function EconomicEventsAdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CpiAdminEvent[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<CpiMetricKey, string>>>>({});
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/admin/login");
      return null;
    }
    return session.access_token;
  }, [router]);

  const applyEvents = useCallback((nextEvents: CpiAdminEvent[]) => {
    setEvents(nextEvents);
    setDrafts((current) => {
      const next = { ...current };
      for (const event of nextEvents) {
        if (next[event.id]) continue;
        next[event.id] = Object.fromEntries(
          event.metrics.map((metric) => [
            metric.key,
            metric.forecast === null ? "" : String(metric.forecast),
          ]),
        ) as Partial<Record<CpiMetricKey, string>>;
      }
      return next;
    });
  }, []);

  const loadEvents = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/economic-events", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse;
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!payload.ok) throw new Error(payload.error);
      applyEvents(payload.events);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [applyEvents, getAccessToken, router]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const nearestEvents = useMemo(() => {
    const now = Date.now();
    return [...events]
      .sort((left, right) => {
        const leftFuture = Date.parse(left.releaseAt) >= now;
        const rightFuture = Date.parse(right.releaseAt) >= now;
        if (leftFuture !== rightFuture) return leftFuture ? -1 : 1;
        if (leftFuture) return Date.parse(left.releaseAt) - Date.parse(right.releaseAt);
        return Date.parse(right.releaseAt) - Date.parse(left.releaseAt);
      })
      .slice(0, 8);
  }, [events]);

  async function syncNow() {
    const token = await getAccessToken();
    if (!token) return;
    setSyncing(true);
    setErrorMessage("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/economic-events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync" }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!payload.ok) throw new Error(payload.error);
      applyEvents(payload.events);
      setNotice("CPI 발표값·일정·시장 반응 동기화를 완료했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }

  async function saveForecast(eventId: string) {
    const token = await getAccessToken();
    if (!token) return;
    setSavingId(eventId);
    setErrorMessage("");
    setNotice("");

    const draft = drafts[eventId] ?? {};
    const forecasts = Object.fromEntries(
      METRIC_KEYS.map((key) => {
        const raw = draft[key]?.trim() ?? "";
        return [key, raw === "" ? null : Number(raw)];
      }),
    ) as Record<CpiMetricKey, number | null>;

    if (Object.values(forecasts).some((value) => value !== null && !Number.isFinite(value))) {
      setErrorMessage("컨센서스는 숫자로 입력해 주세요.");
      setSavingId(null);
      return;
    }

    try {
      const response = await fetch("/api/admin/economic-events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "forecast",
          eventId,
          forecasts,
          sourceName: sourceName.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
        }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!payload.ok) throw new Error(payload.error);
      applyEvents(payload.events);
      setNotice("컨센서스를 저장했습니다. 실제값이 들어오면 서프라이즈가 자동 계산됩니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              HOHAENG EVENT DB
            </p>
            <h1 className="mt-2 text-3xl font-black">CPI 이벤트 데이터 관리자</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              발표 일정과 실제값은 FRED·BLS에서 자동 수집합니다. 무료 원천에서 안정적으로 구하기 어려운
              시장 컨센서스만 발표 전에 한 번 입력하면 됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/data/events/cpi"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:border-slate-500"
            >
              공개 CPI DB →
            </Link>
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {syncing ? "동기화 중..." : "지금 동기화"}
            </button>
          </div>
        </div>

        <section className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-400">
            컨센서스 출처 이름
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="예: Reuters consensus"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
            />
          </label>
          <label className="text-xs font-bold text-slate-400">
            출처 URL
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
            />
          </label>
        </section>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}
        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            불러오는 중...
          </div>
        ) : nearestEvents.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="font-black">아직 CPI 이벤트가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-400">먼저 ‘지금 동기화’를 실행해 주세요.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {nearestEvents.map((event) => {
              const isFuture = Date.parse(event.releaseAt) > Date.now();
              const metricMap = new Map(event.metrics.map((metric) => [metric.key, metric]));
              return (
                <section
                  key={event.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{formatKst(event.releaseAt)}</h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            isFuture
                              ? "bg-blue-950 text-blue-300"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {isFuture ? "발표 예정" : "발표 완료"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        기준월 {event.referencePeriod ?? "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveForecast(event.id)}
                      disabled={savingId === event.id}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      {savingId === event.id ? "저장 중..." : "컨센서스 저장"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    {METRIC_KEYS.map((key) => {
                      const metric = metricMap.get(key);
                      return (
                        <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-xs font-black text-slate-400">{metricLabel(key)}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-600">실제</span>
                              <p className="mt-1 font-black text-white">{valueText(metric?.actual ?? null)}</p>
                            </div>
                            <div>
                              <span className="text-slate-600">이전</span>
                              <p className="mt-1 font-black text-slate-300">{valueText(metric?.previous ?? null)}</p>
                            </div>
                          </div>
                          <label className="mt-3 block text-[11px] font-bold text-orange-300">
                            컨센서스 (%)
                            <input
                              inputMode="decimal"
                              value={drafts[event.id]?.[key] ?? ""}
                              onChange={(inputEvent) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [event.id]: {
                                    ...(current[event.id] ?? {}),
                                    [key]: inputEvent.target.value,
                                  },
                                }))
                              }
                              placeholder="예: 2.8"
                              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm font-bold text-white outline-none focus:border-orange-500"
                            />
                          </label>
                          {metric?.surprise !== null && metric?.surprise !== undefined && (
                            <p className="mt-2 text-[11px] font-bold text-amber-300">
                              서프라이즈 {metric.surprise > 0 ? "+" : ""}{metric.surprise.toFixed(2)}%p
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
