-- Supabase 2026 Data API default grants are opt-in for new tables.
-- These SEO tables are server-only and accessed through the JH service-role client.

grant select, insert, update, delete
  on table public.seo_rank_predictions
  to service_role;

grant select, insert, update, delete
  on table public.seo_daily_keyword_recommendations
  to service_role;
