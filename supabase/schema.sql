-- One row per deployment. Run once in Supabase SQL Editor.
create table if not exists app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security;
-- Demo policy: the server-side key (anon or service_role) may read/write the single state row.
-- The key never reaches the browser. For real multi-user use, replace with per-user rows + auth.
drop policy if exists "demo full access" on app_state;
create policy "demo full access" on app_state for all to anon, service_role using (true) with check (true);
