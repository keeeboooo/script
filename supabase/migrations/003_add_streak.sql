-- ============================================================
-- 003_add_streak.sql
-- Script — Streak: Daily Completion Log
-- ============================================================
-- Tracks which days a user completed at least one task.
-- Used to compute the current streak (consecutive days with completions).
-- ============================================================

create table daily_completion_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  log_date   date not null,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

create index idx_daily_completion_log_user_date on daily_completion_log(user_id, log_date desc);

alter table daily_completion_log enable row level security;

create policy "users can manage own completion log"
  on daily_completion_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
