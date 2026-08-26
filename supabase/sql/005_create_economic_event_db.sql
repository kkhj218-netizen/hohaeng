-- HOHAENG Economic Event DB V1
-- CPI 발표값, 컨센서스, 시장 반응, 사용자 판단 기록을 JH 데이터 프로젝트에 저장한다.

create extension if not exists pgcrypto;

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_name text not null,
  country text not null default 'US',
  release_at timestamptz not null,
  reference_period text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'released', 'completed')),
  source_name text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, release_at)
);

create table if not exists public.economic_event_metrics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.economic_events(id) on delete cascade,
  metric_key text not null,
  metric_name text not null,
  unit text not null default '%',
  actual_value numeric,
  forecast_value numeric,
  previous_value numeric,
  surprise_value numeric,
  source_series_id text,
  source_name text,
  source_url text,
  forecast_source_name text,
  forecast_source_url text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, metric_key)
);

create table if not exists public.economic_event_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.economic_events(id) on delete cascade,
  asset_key text not null,
  asset_name text not null,
  yahoo_symbol text not null,
  basis_label text not null default '발표 직전 대비 · 16:00 ET 동시점',
  pre_value numeric,
  after_30m_value numeric,
  close_value numeric,
  after_1d_value numeric,
  after_5d_value numeric,
  return_30m_pct numeric,
  return_close_pct numeric,
  return_1d_pct numeric,
  return_5d_pct numeric,
  pre_observed_at timestamptz,
  after_30m_observed_at timestamptz,
  close_observed_at timestamptz,
  after_1d_observed_at timestamptz,
  after_5d_observed_at timestamptz,
  source_name text not null default 'Yahoo Finance',
  quality_note text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, asset_key)
);

create table if not exists public.economic_event_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.economic_events(id) on delete cascade,
  market_view text,
  key_driver text,
  watch_points text,
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

create index if not exists economic_events_release_at_idx
  on public.economic_events (release_at desc);

create index if not exists economic_events_event_key_release_at_idx
  on public.economic_events (event_key, release_at desc);

create index if not exists economic_event_metrics_event_id_idx
  on public.economic_event_metrics (event_id);

create index if not exists economic_event_reactions_event_id_idx
  on public.economic_event_reactions (event_id);

create index if not exists economic_event_reactions_asset_key_idx
  on public.economic_event_reactions (asset_key, event_id);

alter table public.economic_events enable row level security;
alter table public.economic_event_metrics enable row level security;
alter table public.economic_event_reactions enable row level security;
alter table public.economic_event_notes enable row level security;

-- 2026 Supabase Data API 기본값 변경 대응.
-- 브라우저 역할(anon/authenticated)은 열지 않고 서버의 JH secret/service role만 사용한다.
grant select, insert, update, delete on public.economic_events to service_role;
grant select, insert, update, delete on public.economic_event_metrics to service_role;
grant select, insert, update, delete on public.economic_event_reactions to service_role;
grant select, insert, update, delete on public.economic_event_notes to service_role;

comment on table public.economic_events is
  'HOHAENG 경제지표 발표 이벤트. 공개 화면은 서버의 JH service role을 통해 조회한다.';
comment on table public.economic_event_metrics is
  '발표 실제값/컨센서스/이전값/서프라이즈. forecast는 관리자 입력 또는 향후 라이선스 데이터로 교체 가능.';
comment on table public.economic_event_reactions is
  '발표 직전 가격 대비 30분/당일 16:00 ET/+1거래일/+5거래일 시장 반응.';
comment on table public.economic_event_notes is
  '호행의 당시 판단과 사후 복기. 숫자로 재생성할 수 없는 개인 판단 기록.';
