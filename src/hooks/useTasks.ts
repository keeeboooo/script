"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Task, TaskStatus } from "@/components/features/task/TaskItem";
import { v4 as uuidv4 } from "uuid";
import { BreakdownResponseSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const supabase = useRef(createClient()).current;

  // ─── DB rows → Task ────────────────────────────────────────────────────────

  const rowToTask = useCallback(
    (row: {
      id: string;
      title: string;
      status: string;
      estimated_time_label: string | null;
      action_link: string | null;
      parent_id: string | null;
      linked_goal: string | null;
      linked_roadmap_id: string | null;
      linked_milestone_id: string | null;
      position: number;
    }): Task => ({
      id: row.id,
      title: row.title,
      status: row.status as TaskStatus,
      estimatedTime: row.estimated_time_label ?? undefined,
      actionLink: row.action_link ?? undefined,
      parentId: row.parent_id ?? undefined,
      linkedGoal: row.linked_goal ?? undefined,
      linkedRoadmapId: row.linked_roadmap_id ?? undefined,
      linkedMilestoneId: row.linked_milestone_id ?? undefined,
    }),
    []
  );

  // ─── Fetch all tasks ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchTasks = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });

      if (!error && data) {
        setTasks(data.map(rowToTask));
      }
      setIsFetching(false);
    };

    fetchTasks();
  }, [rowToTask, supabase]);

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );

      await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id);
    },
    [tasks, supabase]
  );

  const changeTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );

      await supabase.from("tasks").update({ status }).eq("id", id);
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
    },
    [supabase]
  );

  const editTask = useCallback(
    async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      const title = newTitle.trim();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title } : t))
      );
      await supabase.from("tasks").update({ title }).eq("id", id);
    },
    [supabase]
  );

  const reorderTasks = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const updated = [...tasks];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setTasks(updated);

      // position を一括更新
      await supabase.from("tasks").upsert(
        updated.map((t, i) => ({ id: t.id, position: i }))
      );
    },
    [tasks, supabase]
  );

  const clearCompleted = useCallback(async () => {
    const ids = tasks
      .filter((t) => t.status === "done" || t.status === "canceled")
      .map((t) => t.id);

    if (ids.length === 0) return;

    setTasks((prev) =>
      prev.filter((t) => t.status !== "done" && t.status !== "canceled")
    );

    await supabase.from("tasks").delete().in("id", ids);
  }, [tasks, supabase]);

  // ─── Magic Breakdown ────────────────────────────────────────────────────────

  const breakdownTask = useCallback(
    async (prompt: string) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error(`Breakdown API error: ${response.status}`);
        }

        const parsed = BreakdownResponseSchema.safeParse(await response.json());
        if (!parsed.success) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const parentId = uuidv4();

        // 親タスクを挿入
        await supabase.from("tasks").insert({
          id: parentId,
          user_id: user.id,
          title: prompt,
          status: "todo",
          position: 0,
        });

        // 既存タスクの position をずらす
        await supabase.from("tasks").upsert(
          tasks.map((t, i) => ({ id: t.id, position: i + 1 + parsed.data.tasks.length }))
        );

        const subTasks = parsed.data.tasks.map((t, i) => ({
          id: uuidv4(),
          user_id: user.id,
          title: t.title,
          status: "todo" as const,
          estimated_time_label: t.estimatedTime ?? null,
          action_link: t.actionLink ?? null,
          parent_id: parentId,
          position: i + 1,
        }));

        await supabase.from("tasks").insert(subTasks);

        const parentTask: Task = {
          id: parentId,
          title: prompt,
          status: "todo",
        };
        const newTasks: Task[] = subTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: "todo",
          estimatedTime: t.estimated_time_label ?? undefined,
          actionLink: t.action_link ?? undefined,
          parentId,
        }));

        setTasks((prev) => [parentTask, ...newTasks, ...prev]);
      } catch (error) {
        console.error("Failed to breakdown task:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [tasks, supabase]
  );

  // ─── Import from Roadmap (The Thread) ──────────────────────────────────────

  const importFromRoadmap = useCallback(
    async (
      milestone: { id: string; title: string; keyActions: string[] },
      roadmapId: string,
      roadmapLabel: string
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const linkedGoal = `${roadmapLabel} › ${milestone.title}`;
      const newTasks = milestone.keyActions.map((action, i) => ({
        id: uuidv4(),
        user_id: user.id,
        title: action,
        status: "todo" as const,
        linked_goal: linkedGoal,
        linked_roadmap_id: roadmapId,
        linked_milestone_id: milestone.id,
        position: i,
      }));

      await supabase.from("tasks").insert(newTasks);

      setTasks((prev) => [
        ...newTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: "todo" as TaskStatus,
          linkedGoal: t.linked_goal,
          linkedRoadmapId: t.linked_roadmap_id,
          linkedMilestoneId: t.linked_milestone_id,
        })),
        ...prev,
      ]);
    },
    [supabase]
  );

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  return {
    tasks,
    isLoading: isLoading || isFetching,
    isBreakingDown: isLoading,
    completedCount,
    breakdownTask,
    toggleTask,
    changeTaskStatus,
    deleteTask,
    editTask,
    reorderTasks,
    clearCompleted,
    importFromRoadmap,
  };
}
