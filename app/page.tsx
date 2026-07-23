import Link from 'next/link';
import { TOOLS } from './tools';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          호행처럼
        </h1>
        <p className="text-slate-600 mb-8 font-medium">
          매일 쓰는 유용한 3초 간편 도구 & 계산기
        </p>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-left">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            💰 Money OS (금융/세금)
          </h2>

          <div className="space-y-3">
            {TOOLS.map((tool) => (
              <Link 
                key={tool.id}
                href={tool.href} 
                className={`block p-4 rounded-xl bg-slate-50 border border-slate-200/60 transition-all ${tool.hoverColor}`}
              >
                <div className="font-bold text-slate-900">{tool.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {tool.description}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-12">
          © 호행처럼. All rights reserved.
        </p>
      </div>
    </main>
  );
}