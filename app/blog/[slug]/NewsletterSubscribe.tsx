"use client";

import { FormEvent, useState } from "react";

import { supabase } from "@/app/lib/supabase";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setStatus("error");
      setMessage("이메일 주소를 정확히 입력해주세요.");
      return;
    }

    if (!agreed) {
      setStatus("error");
      setMessage("알림 수신과 이메일 수집에 동의해주세요.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: normalizedEmail,
      consented_at: new Date().toISOString(),
      source: "blog-post",
    });

    if (!error) {
      setStatus("success");
      setMessage("신청 완료! 새 글이 올라오면 이메일로 알려드릴게요.");
      setEmail("");
      setAgreed(false);
      return;
    }

    if (error.code === "23505") {
      setStatus("duplicate");
      setMessage("이미 알림을 신청한 이메일이에요.");
      return;
    }

    console.error("새 글 알림 신청 오류:", error);
    setStatus("error");
    setMessage("신청 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
  };

  const isLoading = status === "loading";

  return (
    <section className="px-6 pb-10 sm:px-12" aria-labelledby="newsletter-title">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-black tracking-[0.1em] text-blue-100">
          HOHAENG LETTER
        </p>
        <h2
          id="newsletter-title"
          className="mt-2 text-2xl font-black sm:text-3xl"
        >
          새 글, 놓치지 말고 받아보세요
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-blue-100 sm:text-base">
          돈과 시간을 아껴주는 금융·생활 가이드가 올라오면 이메일로 알려드려요.
        </p>

        <form onSubmit={handleSubmit} className="mt-6" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              이메일 주소
            </label>
            <input
              id="newsletter-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status !== "idle") {
                  setStatus("idle");
                  setMessage("");
                }
              }}
              placeholder="이메일 주소 입력"
              disabled={isLoading}
              className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/25 disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="shrink-0 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? "신청 중..." : "새 글 알림 신청"}
            </button>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs font-medium leading-5 text-blue-100">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 shrink-0 accent-slate-950"
            />
            <span>
              새 글 알림 발송을 위한 이메일 수집·이용에 동의합니다. 이메일은
              알림 발송에만 사용되며 언제든 수신을 취소할 수 있습니다.
            </span>
          </label>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${
                status === "success" || status === "duplicate"
                  ? "bg-emerald-400/20 text-emerald-50"
                  : "bg-rose-400/20 text-rose-50"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}