-- ============================================================
-- FocusTrackr — Full Schema
-- ============================================================

-- ── 1. Tasks ────────────────────────────────────────
create table if not exists tasks_db (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  done boolean default false,
  done_at timestamp with time zone,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- ── 2. Categories ────────────────────────────────────────────
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  colour text not null default '#534AB7',
  created_at timestamp with time zone default now()
);

-- ── 3. Subcategories ─────────────────────────────────────────
create table if not exists subcategories (
  id uuid default gen_random_uuid() primary key,
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now(),
  unique (category_id, name)
);

-- ── RLS Policies ──────────────────────────────────────────────
alter table categories    enable row level security;
alter table subcategories enable row level security;
alter table tasks_db      enable row level security;
 
create policy "Public access" on categories    for all using (true);
create policy "Public access" on subcategories for all using (true);
create policy "Public access" on tasks_db      for all using (true);
