-- ============================================================
-- 001_initial_schema.sql
-- Script — Initial Database Schema
-- ============================================================
-- Run this first on a fresh Supabase project.
-- Definition order matters: roadmaps → milestones → tasks
-- (tasks references both roadmaps and milestones)
-- ============================================================

-- ─── Compass: Roadmap ────────────────────────────────────────────────────────

create table roadmaps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text,
  goal        text not null,
  timeframe   text not null,
  created_at  timestamptz default now()
);

create table milestones (
  id           uuid primary key default gen_random_uuid(),
  roadmap_id   uuid references roadmaps(id) on delete cascade not null,
  period       text not null,
  title        text not null,
  description  text not null,
  key_actions  text[] not null default '{}',
  is_imported  boolean not null default false,
  is_completed boolean not null default false,
  completed_at timestamptz,
  position     integer not null default 0
);

-- ─── Compass: Philosophy ─────────────────────────────────────────────────────
-- Note: multiple philosophies per user are supported (no unique constraint on user_id).
-- is_active = true means this philosophy is used for roadmap generation.
-- A partial unique index ensures at most one active philosophy per user.

create table philosophies (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users not null,
  title              text not null,
  life_statement     text not null,
  beliefs            text[] not null default '{}',
  action_principles  text[] not null default '{}',
  is_active          boolean not null default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create unique index idx_philosophies_one_active_per_user
  on philosophies(user_id) where is_active = true;

create table philosophy_values (
  id             uuid primary key default gen_random_uuid(),
  philosophy_id  uuid references philosophies(id) on delete cascade not null,
  name           text not null,
  description    text not null,
  origin         text not null,
  position       integer not null default 0
);

-- ─── Compass: Chat messages ───────────────────────────────────────────────────
-- philosophy_id links messages to a specific philosophy session.
-- Nullable to support legacy/orphaned messages.
-- ON DELETE CASCADE: deleting a philosophy removes its chat history.

create table compass_messages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  philosophy_id  uuid references philosophies(id) on delete cascade,
  role           text not null check (role in ('user', 'assistant')),
  content        text not null,
  created_at     timestamptz default now()
);

-- ─── Engine: Tasks ────────────────────────────────────────────────────────────

create table tasks (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users not null,
  title                text not null,
  status               text not null default 'todo'
                         check (status in ('todo', 'in_progress', 'done', 'canceled')),
  parent_id            uuid references tasks(id) on delete cascade,
  estimated_minutes    integer,
  estimated_time_label text,
  action_link          text,
  linked_goal          text,
  linked_roadmap_id    uuid references roadmaps(id) on delete set null,
  linked_milestone_id  uuid references milestones(id) on delete set null,
  position             integer not null default 0,
  completed_at         timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index idx_tasks_user_id               on tasks(user_id);
create index idx_tasks_parent_id             on tasks(parent_id);
create index idx_tasks_linked_roadmap_id     on tasks(linked_roadmap_id);
create index idx_tasks_linked_milestone_id   on tasks(linked_milestone_id);
create index idx_roadmaps_user_id            on roadmaps(user_id);
create index idx_milestones_roadmap_id       on milestones(roadmap_id);
create index idx_compass_messages_user_id    on compass_messages(user_id);
create index idx_compass_messages_philosophy_id on compass_messages(philosophy_id);
create index idx_philosophies_user_id        on philosophies(user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

create trigger philosophies_updated_at
  before update on philosophies
  for each row execute function update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table tasks             enable row level security;
alter table roadmaps          enable row level security;
alter table milestones        enable row level security;
alter table philosophies      enable row level security;
alter table philosophy_values enable row level security;
alter table compass_messages  enable row level security;

create policy "users can manage own tasks"
  on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can manage own roadmaps"
  on roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can manage own milestones"
  on milestones for all
  using (exists (
    select 1 from roadmaps where roadmaps.id = milestones.roadmap_id
      and roadmaps.user_id = auth.uid()
  ));

create policy "users can manage own philosophy"
  on philosophies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can manage own philosophy values"
  on philosophy_values for all
  using (exists (
    select 1 from philosophies where philosophies.id = philosophy_values.philosophy_id
      and philosophies.user_id = auth.uid()
  ));

create policy "users can manage own compass messages"
  on compass_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
