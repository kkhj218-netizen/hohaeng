create table if not exists public.seo_rank_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  url text,
  primary_keyword text not null,
  secondary_keywords text[] not null default '{}',
  search_intent text not null default '정보 탐색형',
  content_role text not null default 'cluster',
  opportunity_score smallint not null check (opportunity_score between 0 and 100),
  serp_difficulty smallint not null check (serp_difficulty between 0 and 100),
  site_authority smallint not null check (site_authority between 0 and 100),
  title_score smallint not null check (title_score between 0 and 100),
  predicted_min smallint not null check (predicted_min between 1 and 100),
  predicted_max smallint not null check (predicted_max between 1 and 100),
  top10_probability smallint not null check (top10_probability between 0 and 100),
  confidence text not null default '낮음',
  model_version text not null default 'v3.0',
  serp_connected boolean not null default false,
  gsc_connected boolean not null default false,
  gsc_avg_position numeric(8,2),
  gsc_impressions bigint not null default 0,
  gsc_clicks bigint not null default 0,
  analysis jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  actual_position_7d numeric(8,2),
  actual_position_14d numeric(8,2),
  actual_position_30d numeric(8,2),
  actual_position_60d numeric(8,2),
  prediction_error_30d numeric(8,2),
  last_checked_at timestamptz
);

create index if not exists seo_rank_predictions_created_at_idx
  on public.seo_rank_predictions (created_at desc);
create index if not exists seo_rank_predictions_keyword_idx
  on public.seo_rank_predictions (primary_keyword);
create index if not exists seo_rank_predictions_url_idx
  on public.seo_rank_predictions (url)
  where url is not null;
create index if not exists seo_rank_predictions_calibration_idx
  on public.seo_rank_predictions (published_at, last_checked_at)
  where published_at is not null and url is not null;

alter table public.seo_rank_predictions enable row level security;

comment on table public.seo_rank_predictions is 'HOHAENG Google Rank Predictor V3 prediction history and Search Console calibration data';
comment on column public.seo_rank_predictions.analysis is 'Full model inputs, score breakdown, SERP snapshot, GSC related-query snapshot, recommendations and cluster suggestions';
