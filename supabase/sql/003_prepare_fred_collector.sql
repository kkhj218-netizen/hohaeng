-- JH Hedge Fund Data Pack V1
-- FRED 수집기 실행 전 중복 방지 및 조회 성능 준비

create unique index if not exists historical_data_series_observed_at_uidx
  on public.historical_data (series_id, observed_at);

create index if not exists historical_data_observed_at_idx
  on public.historical_data (observed_at desc);

create index if not exists collection_runs_source_started_at_idx
  on public.collection_runs (source_code, started_at desc);

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('historical_data', 'collection_runs')
order by tablename, indexname;
