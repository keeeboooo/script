-- ============================================================
-- 002_add_scheduled.sql
-- Script — Phase 3: Scheduling & Smart Nudge
-- ============================================================
-- Adds scheduling columns to the tasks table so that tasks
-- can be assigned a specific date/time (Implementation Intention).
-- first_step stores the AI-generated "minimum first action" hint.
-- ============================================================

alter table tasks
  add column scheduled_date date,
  add column scheduled_time time,
  add column first_step text;

create index idx_tasks_scheduled_date on tasks(scheduled_date);
