-- ============================================================
-- FocusTrackr v2 — Full Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. Categories ─────────────────────────────────────────────
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  colour text not null default '#534AB7',
  icon text not null default '📋',
  created_at timestamp with time zone default now()
);

-- ── 2. Subcategories ──────────────────────────────────────────
create table if not exists subcategories (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now(),
  unique(category_id, name)
);

-- ── 3. Tasks (updated) ────────────────────────────────────────
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tag text default 'personal',
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  due_date text,
  due_date_iso date,
  score integer,
  ai_score integer,          -- original AI score, never overwritten
  priority text,
  done boolean default false,
  done_at timestamp with time zone,
  notes text default '',
  score_reason text,
  estimated_minutes integer, -- for quick wins filter
  created_at timestamp with time zone default now()
);

-- ── 4. Score history ──────────────────────────────────────────
create table if not exists score_history (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  old_score integer,
  new_score integer not null,
  source text not null default 'ai', -- 'ai' | 'manual'
  reason text,                        -- optional user note
  created_at timestamp with time zone default now()
);

-- ── RLS Policies ──────────────────────────────────────────────
alter table categories    enable row level security;
alter table subcategories enable row level security;
alter table tasks         enable row level security;
alter table score_history enable row level security;

create policy "Public access" on categories    for all using (true);
create policy "Public access" on subcategories for all using (true);
create policy "Public access" on tasks         for all using (true);
create policy "Public access" on score_history for all using (true);

-- ── Seed: Fixed categories ────────────────────────────────────
insert into categories (name, colour, icon) values
  ('Work',     '#3B82F6', '💼'),
  ('Personal', '#8B5CF6', '🏠'),
  ('Health',   '#10B981', '💪'),
  ('Finance',  '#F59E0B', '💰'),
  ('Learning', '#EC4899', '📚'),
  ('Home',     '#6B7280', '🏡')
on conflict (name) do nothing;

-- ── Seed: Subcategories ───────────────────────────────────────
insert into subcategories (category_id, name)
select id, unnest(array['Meetings','Projects','Admin','Development','Emails'])
from categories where name = 'Work'
on conflict do nothing;

insert into subcategories (category_id, name)
select id, unnest(array['Errands','Family','Social','Goals','Appointments'])
from categories where name = 'Personal'
on conflict do nothing;

insert into subcategories (category_id, name)
select id, unnest(array['Exercise','Nutrition','Sleep','Medical','Wellbeing'])
from categories where name = 'Health'
on conflict do nothing;

insert into subcategories (category_id, name)
select id, unnest(array['Bills','Budgeting','Investments','Tax','Shopping'])
from categories where name = 'Finance'
on conflict do nothing;

insert into subcategories (category_id, name)
select id, unnest(array['Reading','Courses','Research','Practice','Notes'])
from categories where name = 'Learning'
on conflict do nothing;

insert into subcategories (category_id, name)
select id, unnest(array['Cleaning','Repairs','Organisation','Garden','Shopping'])
from categories where name = 'Home'
on conflict do nothing;
