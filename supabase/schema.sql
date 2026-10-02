-- One row per deployment. Run once in Supabase SQL Editor.
create table if not exists app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security; -- server uses the service role key; no public policies.
