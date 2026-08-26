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

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((event) => Date.parse(event.releaseAt) >= now)
      .sort((left, right) => Date.parse(left.releaseAt) - Date.parse(right.releaseAt))[0] ?? null;
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
      setNotice("CPI 일정·실제값·이전값·시장 반응을 자동 동기화했습니다.");
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
      setNotice("다가오는 CPI 컨센서스 4개를 한 번에 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingId(null);
    }
  }

  const metricMap = useMemo(
    () => new Map(nextEvent?.metrics.map((metric) => [metric.key, metric]) ?? []),
    [nextEvent],
  );

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
              일정·실제값·이전값·시장 반응은 자동으로 쌓입니다. 관리자는 다음 CPI 발표의
              컨센서스 4개만 한 번 입력하면 됩니다.
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
              {syncing ? "동기화 중..." : "자동 데이터 동기화"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          과거 CPI 카드는 여기서 관리하지 않습니다. 기존 발표 데이터는 DB에 자동 보관되고 공개 CPI 페이지에서 활용됩니다.
        </div>

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
        ) : !nextEvent ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="font-black">다가오는 CPI 일정이 없습니다.</p>
            <p className="mt-2 text-sm text-slate-400">
              ‘자동 데이터 동기화’를 눌러 최신 CPI 발표 일정을 다시 불러와 주세요.
            </p>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-950 px-2.5 py-1 text-[11px] font-black text-blue-300">
                    다음 CPI 발표
                  </span>
                  <h2 className="text-xl font-black">{formatKst(nextEvent.releaseAt)}</h2>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  기준월 {nextEvent.referencePeriod ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                아래 4개 입력 → 저장 버튼 1번
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {METRIC_KEYS.map((key) => {
                const metric = metricMap.get(key);
                return (
                  <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs font-black text-slate-300">{metricLabel(key)}</p>
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
                        value={drafts[nextEvent.id]?.[key] ?? ""}
                        onChange={(inputEvent) =>
                          setDrafts((current) => ({
                            ...current,
                            [nextEvent.id]: {
                              ...(current[nextEvent.id] ?? {}),
                              [key]: inputEvent.target.value,
                            },
                          }))
                        }
                        placeholder="예: 2.8"
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm font-bold text-white outline-none focus:border-orange-500"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-400">
                컨센서스 출처 이름 <span className="font-normal text-slate-600">(선택)</span>
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  placeholder="예: Reuters consensus"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                />
              </label>
              <label className="text-xs font-bold text-slate-400">
                출처 URL <span className="font-normal text-slate-600">(선택)</span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void saveForecast(nextEvent.id)}
              disabled={savingId === nextEvent.id}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50 sm:w-auto"
            >
              {savingId === nextEvent.id ? "저장 중..." : "컨센서스 4개 전체 저장"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
