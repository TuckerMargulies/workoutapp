-- ============================================================
-- Supabase Schema for Workout App
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable RLS (Row Level Security)
-- All tables use auth.uid() to scope data per user

-- ---- User Preferences (breakdown + locations) ----
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  breakdown_preferences jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table user_preferences enable row level security;

create policy "Users can view own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

-- ---- Workout Logs ----
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date timestamptz not null,
  total_time_allotted_sec int not null,
  total_time_elapsed_sec int not null,
  location text not null,
  equipment jsonb not null default '[]'::jsonb,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table workout_logs enable row level security;

create policy "Users can view own logs"
  on workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on workout_logs for delete
  using (auth.uid() = user_id);

-- ---- Current Workout Plan (transient, 1 per user) ----
create table if not exists current_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan jsonb not null,
  exercise_index int not null default 0,
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table current_plan enable row level security;

create policy "Users can view own plan"
  on current_plan for select
  using (auth.uid() = user_id);

create policy "Users can insert own plan"
  on current_plan for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plan"
  on current_plan for update
  using (auth.uid() = user_id);

create policy "Users can delete own plan"
  on current_plan for delete
  using (auth.uid() = user_id);

-- ---- Function to auto-update updated_at ----
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();

create trigger current_plan_updated_at
  before update on current_plan
  for each row execute function update_updated_at();
