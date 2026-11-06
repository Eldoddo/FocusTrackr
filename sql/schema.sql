-- ============================================================
-- FocusTrackr — Full Schema
-- ============================================================


-- ── 1. Tasks (updated) ────────────────────────────────────────
create table if not exists tasks_db (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  done boolean default false,
  done_at timestamp with time zone,
  created_at timestamp with time zone default now()
);


-- ── RLS Policies ──────────────────────────────────────────────

alter table tasks_db         enable row level security;

create policy "Public access" on tasks_db         for all using (true);


