-- ============================================================
-- 005_add_streak_freeze.sql
-- Streak Freeze: 月3回まで利用可能なStreakの保護機能
-- ============================================================

create table streak_freezes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  freeze_date date not null,
  created_at  timestamptz default now(),
  unique (user_id, freeze_date)
);

create index idx_streak_freezes_user_date on streak_freezes(user_id, freeze_date desc);

alter table streak_freezes enable row level security;

create policy "users can manage own streak freezes"
  on streak_freezes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
