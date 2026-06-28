-- ============================================================
-- 004_add_lists.sql
-- Engine: List（カテゴリ）モデルの追加
-- ============================================================

-- ─── Engine: Lists ───────────────────────────────────────────

create table lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz default now()
);

create index idx_lists_user_id on lists(user_id);

alter table lists enable row level security;

create policy "users can manage own lists"
  on lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── tasks に list_id を追加 ──────────────────────────────────

alter table tasks add column list_id uuid references lists(id) on delete set null;

create index idx_tasks_list_id on tasks(list_id);
