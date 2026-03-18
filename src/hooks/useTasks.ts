"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Task, TaskStatus } from "@/components/features/task/TaskItem";
import { v4 as uuidv4 } from "uuid";
import { RawTaskSchema, BreakdownResponseSchema } from "@/lib/schemas";

const STORAGE_KEY = "engine-tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = RawTaskSchema.array().safeParse(JSON.parse(saved));
        if (parsed.success) {
          const migratedTasks: Task[] = parsed.data.map((t) => ({
            ...t,
            status: t.isCompleted ? "done" : t.status,
          }));
          setTasks(migratedTasks);
        }
      }
    } catch (e) {
      console.error("Failed to load tasks from localStorage:", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage — only after hydration to avoid overwriting with []
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, isHydrated]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
      )
    );
  }, []);

  const changeTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const editTask = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle.trim() } : t))
    );
  }, []);

  const reorderTasks = useCallback((fromIndex: number, toIndex: number) => {
    setTasks((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "done" && t.status !== "canceled"));
  }, []);

  const breakdownTask = useCallback(async (prompt: string) => {
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
      if (parsed.success) {
        const parentId = uuidv4();
        const parentTask: Task = {
          id: parentId,
          title: prompt,
          status: "todo",
        };

        const newTasks: Task[] = parsed.data.tasks.map((t) => ({
          id: uuidv4(),
          title: t.title,
          status: "todo",
          estimatedTime: t.estimatedTime,
          actionLink: t.actionLink,
          parentId,
        }));

        setTasks((prev) => [parentTask, ...newTasks, ...prev]);
      }
    } catch (error) {
      console.error("Failed to breakdown task:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importFromRoadmap = useCallback(
    (
      milestone: { id: string; title: string; keyActions: string[] },
      roadmapId: string,
      roadmapLabel: string
    ) => {
      const linkedGoal = `${roadmapLabel} › ${milestone.title}`;
      const newTasks: Task[] = milestone.keyActions.map((action) => ({
        id: uuidv4(),
        title: action,
        status: "todo",
        linkedGoal,
        linkedRoadmapId: roadmapId,
        linkedMilestoneId: milestone.id,
      }));

      setTasks((prev) => [...newTasks, ...prev]);
    },
    []
  );

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  return {
    tasks,
    isLoading,
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
