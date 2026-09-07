create table if not exists public.seo_daily_keyword_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_date date not null,
  rank smallint not null check (rank between 1 and 5),
  keyword text not null,
  recommended_title text not null,
  source_type text not null default 'gsc',
  strategy text not null default '신규 확장',
  reason text not null default '',
  candidate_score smallint not null check (candidate_score between 0 and 100),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recommendation_date, rank),
  unique (recommendation_date, keyword)
);

create index if not exists seo_daily_keyword_recommendations_date_idx
  on public.seo_daily_keyword_recommendations (recommendation_date desc, rank asc);
create index if not exists seo_daily_keyword_recommendations_keyword_idx
  on public.seo_daily_keyword_recommendations (keyword);

alter table public.seo_daily_keyword_recommendations enable row level security;

comment on table public.seo_daily_keyword_recommendations is 'HOHAENG daily SEO keyword recommendations with Rank Predictor V3 analysis';
comment on column public.seo_daily_keyword_recommendations.analysis is 'Full Google Rank Predictor V3 output for the recommended article title';
