-- HOHAENG MARKET MAP snapshot storage
-- 미국장 마감 후 완성된 NASDAQ100 / S&P500 MARKET MAP을 JSONB로 저장한다.
-- 공개 화면은 브라우저에서 직접 조회하지 않고 JH 서버의 service role만 사용한다.

create extension if not exists pgcrypto;

create table if not exists public.market_map_snapshots (
  id uuid primary key default gen_random_uuid(),
  index_key text not null
    check (index_key in ('nasdaq100', 'sp500')),
  market_date date not null,
  snapshot jsonb not null,
  source_name text not null default 'HOHAENG MARKET MAP',
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (index_key, market_date)
);

create index if not exists market_map_snapshots_index_date_idx
  on public.market_map_snapshots (index_key, market_date desc);

alter table public.market_map_snapshots enable row level security;

-- 2026 Supabase Data API 기본값 변경 대응.
-- anon/authenticated에는 공개하지 않고 서버 service role만 접근한다.
grant select, insert, update, delete on public.market_map_snapshots to service_role;

comment on table public.market_map_snapshots is
  'HOHAENG NASDAQ100/S&P500 장마감 MARKET MAP 완성 스냅샷. 공개 페이지는 외부 시세 API 대신 이 결과를 우선 조회한다.';
