'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      router.push('/admin/write');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(
        error?.message || '로그인에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔐</div>

          <h1 className="text-2xl font-black text-white">
            호행처럼 관리자
          </h1>

          <p className="text-sm text-slate-400 mt-2">
            관리자 계정으로 로그인하세요.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              이메일
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="관리자 이메일"
              autoComplete="email"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              비밀번호
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="관리자 비밀번호"
              autoComplete="current-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors"
          >
            {loading
              ? '로그인 중...'
              : '관리자 로그인'}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          HOHAENG Admin CMS
        </p>
      </div>
    </main>
  );
}