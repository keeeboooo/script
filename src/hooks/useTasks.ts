"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskStatus } from "@/components/features/task/TaskItem";
import { v4 as uuidv4 } from "uuid";
import { BreakdownResponseSchema, BreakdownTaskSchema } from "@/lib/schemas";
import { getTodayStr } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError, getUserFriendlyErrorMessage, NETWORK_ERROR_MESSAGE, parseApiError } from "@/lib/errors";

const SingleEditResponseSchema = z.object({ task: BreakdownTaskSchema });

export function useTasks() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [streakDays, setStreakDays] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  const pendingDeletesRef = useRef<Map<string, {
    tasksToRestore: Task[];
    insertIndex: number;
    timeoutId: ReturnType<typeof setTimeout>;
  }>>(new Map());

  // ─── DB rows → Task ────────────────────────────────────────────────────────

  const rowToTask = useCallback(
    (row: {
      id: string;
      title: string;
      status: string;
      estimated_time_label: string | null;
      estimated_minutes: number | null;
      action_link: string | null;
      parent_id: string | null;
      linked_goal: string | null;
      linked_roadmap_id: string | null;
      linked_milestone_id: string | null;
      scheduled_date: string | null;
      scheduled_time: string | null;
      first_step: string | null;
      position: number;
    }): Task => ({
      id: row.id,
      title: row.title,
      status: row.status as TaskStatus,
      estimatedTime: row.estimated_time_label ?? undefined,
      estimatedMinutes: row.estimated_minutes ?? undefined,
      actionLink: row.action_link ?? undefined,
      parentId: row.parent_id ?? undefined,
      linkedGoal: row.linked_goal ?? undefined,
      linkedRoadmapId: row.linked_roadmap_id ?? undefined,
      linkedMilestoneId: row.linked_milestone_id ?? undefined,
      scheduledDate: row.scheduled_date ?? undefined,
      scheduledTime: row.scheduled_time ?? undefined,
      firstStep: row.first_step ?? undefined,
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

      if (error) {
        console.error("Failed to fetch tasks:", error);
      } else if (data) {
        setTasks(data.map(rowToTask));
      }
      setIsFetching(false);
    };

    fetchTasks();
  }, [rowToTask, supabase]);

  // ─── Streak ────────────────────────────────────────────────────────────────

  const fetchStreak = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("daily_completion_log")
      .select("log_date")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(365);

    if (!data || data.length === 0) {
      setStreakDays(0);
      return;
    }

    const LogRowSchema = z.object({ log_date: z.string() });

    const today = getTodayStr();
    let streak = 0;
    let cursor = today;

    for (const row of data) {
      const parsed = LogRowSchema.safeParse(row);
      if (!parsed.success) break;
      if (parsed.data.log_date === cursor) {
        streak++;
        const [y, m, d] = cursor.split("-").map(Number);
        const prev = new Date(Date.UTC(y!, m! - 1, d! - 1));
        cursor = prev.toISOString().split("T")[0] ?? cursor;
      } else {
        break;
      }
    }

    setStreakDays(streak);
  }, [supabase]);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  useEffect(() => {
    const ref = pendingDeletesRef.current;
    return () => {
      ref.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    };
  }, []);

  const recordCompletionToday = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = getTodayStr();
    await supabase
      .from("daily_completion_log")
      .upsert({ user_id: user.id, log_date: today }, { onConflict: "user_id,log_date" });

    void fetchStreak();
  }, [supabase, fetchStreak]);

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

      if (newStatus === "done") {
        void recordCompletionToday();
      }

      // サブタスクを done にした時、全兄弟が done/canceled なら親も自動完了
      // 注: siblings は setTasks 前の tasks を参照するため、対象タスク自身はまだ "done" でない状態で評価される
      if (newStatus === "done" && task.parentId) {
        const siblings = tasks.filter(
          (t) => t.parentId === task.parentId && t.id !== id
        );
        // サブタスクが1つだけの場合（siblings が空）は自動完了しない
        if (siblings.length > 0) {
          const allSiblingsDone = siblings.every(
            (t) => t.status === "done" || t.status === "canceled"
          );
          if (allSiblingsDone) {
            const parentPrevStatus = tasks.find((t) => t.id === task.parentId)?.status;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.parentId ? { ...t, status: "done" } : t
              )
            );
            const { error: parentError } = await supabase
              .from("tasks")
              .update({ status: "done" })
              .eq("id", task.parentId);
            if (parentError && parentPrevStatus !== undefined) {
              // ロールバック: 親タスクの更新が失敗した場合は元のステータスに戻す
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.parentId ? { ...t, status: parentPrevStatus } : t
                )
              );
            }
          }
        }
      }

      // linked_milestone_id があるタスクが done になった時、同じマイルストーンに紐づく全タスクが完了なら Toast 通知
      if (newStatus === "done" && task.linkedMilestoneId) {
        const linkedTasks = tasks.filter(
          (t) => t.linkedMilestoneId === task.linkedMilestoneId && t.id !== id
        );
        const allLinkedDone = linkedTasks.every(
          (t) => t.status === "done" || t.status === "canceled"
        );
        if (allLinkedDone) {
          const parts = task.linkedGoal?.split(" › ");
          const milestoneName = parts && parts.length >= 2 ? parts.slice(1).join(" › ") : (task.linkedGoal ?? "");
          toast.success(
            `マイルストーン「${milestoneName}」のタスクが全て完了！`,
            {
              description: "Compassでマイルストーンを完了にしましょう",
              action: {
                label: "Compassを開く",
                onClick: () => { router.push("/compass"); },
              },
              duration: 8000,
            }
          );
        }
      }
    },
    [tasks, supabase, recordCompletionToday]
  );

  const changeTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );

      await supabase.from("tasks").update({ status }).eq("id", id);

      if (status === "done") {
        void recordCompletionToday();
      }
    },
    [supabase, recordCompletionToday]
  );

  const deleteTask = useCallback(
    (id: string) => {
      let tasksToRestore: Task[] = [];
      let insertIndex = 0;

      setTasks((prev) => {
        insertIndex = prev.findIndex((t) => t.id === id);
        tasksToRestore = prev.filter((t) => t.id === id || t.parentId === id);
        return prev.filter((t) => t.id !== id && t.parentId !== id);
      });

      const timeoutId = setTimeout(async () => {
        pendingDeletesRef.current.delete(id);
        const idsToDelete = tasksToRestore.map((t) => t.id);
        const { error } = await supabase.from("tasks").delete().in("id", idsToDelete);
        if (error) {
          toast.error("削除に失敗しました。もう一度お試しください。");
          setTasks((prev) => {
            const result = [...prev];
            result.splice(insertIndex, 0, ...tasksToRestore);
            return result;
          });
        }
      }, 5000);

      pendingDeletesRef.current.set(id, { tasksToRestore, insertIndex, timeoutId });
    },
    [supabase]
  );

  const undoDelete = useCallback((id: string) => {
    const pending = pendingDeletesRef.current.get(id);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingDeletesRef.current.delete(id);

    setTasks((prev) => {
      const result = [...prev];
      result.splice(pending.insertIndex, 0, ...pending.tasksToRestore);
      return result;
    });
  }, []);

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
    async (fromId: string, toId: string) => {
      const updated = [...tasks];
      const fromIndex = updated.findIndex((t) => t.id === fromId);
      const toIndex = updated.findIndex((t) => t.id === toId);
      if (fromIndex === -1 || toIndex === -1) return;
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

  // ─── Scheduling ────────────────────────────────────────────────────────────

  const scheduleTask = useCallback(
    async (id: string, date: string, time?: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;

      const isParent = !target.parentId;

      // 親タスクの場合: 未上書きのサブタスク（親と同じ日付 or 未設定）も一括更新
      const inheritingSubTasks = isParent
        ? tasks.filter(
            (t) => t.parentId === id && (t.scheduledDate === target.scheduledDate)
          )
        : [];

      const prevSnapshots = [target, ...inheritingSubTasks].map((t) => ({
        id: t.id,
        scheduledDate: t.scheduledDate,
        scheduledTime: t.scheduledTime,
      }));

      // 楽観的更新
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) return { ...t, scheduledDate: date, scheduledTime: time ?? undefined };
          if (inheritingSubTasks.some((s) => s.id === t.id)) return { ...t, scheduledDate: date, scheduledTime: time ?? undefined };
          return t;
        })
      );

      const idsToUpdate = [id, ...inheritingSubTasks.map((t) => t.id)];
      const { error } = await supabase
        .from("tasks")
        .update({ scheduled_date: date, scheduled_time: time ?? null })
        .in("id", idsToUpdate);

      if (error) {
        // ロールバック
        setTasks((prev) =>
          prev.map((t) => {
            const snap = prevSnapshots.find((s) => s.id === t.id);
            return snap ? { ...t, scheduledDate: snap.scheduledDate, scheduledTime: snap.scheduledTime } : t;
          })
        );
      }
    },
    [tasks, supabase]
  );

  const unscheduleTask = useCallback(
    async (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;

      const isParent = !target.parentId;

      // 親タスクの場合: 未上書きのサブタスク（親と同じ日付）も一括解除
      const inheritingSubTasks = isParent
        ? tasks.filter(
            (t) => t.parentId === id && t.scheduledDate === target.scheduledDate
          )
        : [];

      const prevSnapshots = [target, ...inheritingSubTasks].map((t) => ({
        id: t.id,
        scheduledDate: t.scheduledDate,
        scheduledTime: t.scheduledTime,
      }));

      // 楽観的更新
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) return { ...t, scheduledDate: undefined, scheduledTime: undefined };
          if (inheritingSubTasks.some((s) => s.id === t.id)) return { ...t, scheduledDate: undefined, scheduledTime: undefined };
          return t;
        })
      );

      const idsToUpdate = [id, ...inheritingSubTasks.map((t) => t.id)];
      const { error } = await supabase
        .from("tasks")
        .update({ scheduled_date: null, scheduled_time: null })
        .in("id", idsToUpdate);

      if (error) {
        // ロールバック
        setTasks((prev) =>
          prev.map((t) => {
            const snap = prevSnapshots.find((s) => s.id === t.id);
            return snap ? { ...t, scheduledDate: snap.scheduledDate, scheduledTime: snap.scheduledTime } : t;
          })
        );
      }
    },
    [tasks, supabase]
  );

  // ─── Magic Breakdown ────────────────────────────────────────────────────────

  const breakdownTask = useCallback(
    async (prompt: string): Promise<string | null> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw await parseApiError(response);
        }

        const parsed = BreakdownResponseSchema.safeParse(await response.json());
        if (!parsed.success) return null;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.warn("breakdownTask: user not authenticated");
          return null;
        }

        const parentId = uuidv4();
        const firstStep = parsed.data.firstStep;

        // 親タスクを挿入
        await supabase.from("tasks").insert({
          id: parentId,
          user_id: user.id,
          title: prompt,
          status: "todo",
          position: 0,
          first_step: firstStep ?? null,
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
          estimated_minutes: t.estimatedMinutes ?? null,
          action_link: t.actionLink ?? null,
          parent_id: parentId,
          position: i + 1,
        }));

        await supabase.from("tasks").insert(subTasks);

        const parentTask: Task = {
          id: parentId,
          title: prompt,
          status: "todo",
          firstStep,
        };
        const newTasks: Task[] = subTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: "todo",
          estimatedTime: t.estimated_time_label ?? undefined,
          estimatedMinutes: t.estimated_minutes ?? undefined,
          actionLink: t.action_link ?? undefined,
          parentId,
        }));

        setTasks((prev) => [parentTask, ...newTasks, ...prev]);
        return parentId;
      } catch (error: unknown) {
        console.error("Failed to breakdown task:", error);
        if (error instanceof ApiError) {
          toast.error(getUserFriendlyErrorMessage(error.status, error.errorCode));
        } else {
          toast.error(NETWORK_ERROR_MESSAGE);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [tasks, supabase]
  );

  // ─── Edit Breakdown (AI Editing) ──────────────────────────────────────────

  const editBreakdown = useCallback(
    async (taskId: string, instruction: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // サブタスク単体編集: parentId がある = サブタスク自身のID
      if (task.parentId) {
        const parent = tasks.find((t) => t.id === task.parentId);
        if (!parent) return;

        const siblingSubTasks = tasks.filter((t) => t.parentId === task.parentId);

        const response = await fetch("/api/breakdown/edit/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentPrompt: parent.title,
            targetTask: { title: task.title, estimatedTime: task.estimatedTime, actionLink: task.actionLink },
            allCurrentTasks: siblingSubTasks.map((t) => ({
              title: t.title,
              estimatedTime: t.estimatedTime,
              actionLink: t.actionLink,
              isTarget: t.id === taskId,
            })),
            instruction,
          }),
        });

        if (!response.ok) {
          throw await parseApiError(response);
        }

        const parsed = SingleEditResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new ApiError(502, "AI_PARSE_FAILURE");

        const updated = parsed.data.task;

        await supabase
          .from("tasks")
          .update({
            title: updated.title,
            estimated_time_label: updated.estimatedTime ?? null,
            action_link: updated.actionLink ?? null,
          })
          .eq("id", taskId);

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, title: updated.title, estimatedTime: updated.estimatedTime, actionLink: updated.actionLink }
              : t
          )
        );
        return;
      }

      // 全サブタスク置換（親タスクのAI編集）
      const currentSubTasks = tasks.filter((t) => t.parentId === taskId);

      const response = await fetch("/api/breakdown/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPrompt: task.title,
          currentTasks: currentSubTasks.map((t) => ({
            title: t.title,
            estimatedTime: t.estimatedTime,
            actionLink: t.actionLink,
          })),
          instruction,
        }),
      });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      const parsed = BreakdownResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new ApiError(502, "AI_PARSE_FAILURE");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const oldSubTaskIds = currentSubTasks.map((t) => t.id);

      const newSubTasks = parsed.data.tasks.map((t, i) => ({
        id: uuidv4(),
        user_id: user.id,
        title: t.title,
        status: "todo" as const,
        estimated_time_label: t.estimatedTime ?? null,
        action_link: t.actionLink ?? null,
        parent_id: taskId,
        position: i + 1,
      }));

      // INSERT先にしてからDELETE（データ消失リスクを回避）
      await supabase.from("tasks").insert(newSubTasks);
      if (oldSubTaskIds.length > 0) {
        await supabase.from("tasks").delete().in("id", oldSubTaskIds);
      }

      setTasks((prev) => {
        const withoutOldSubtasks = prev.filter((t) => t.parentId !== taskId);
        const newTaskItems: Task[] = newSubTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: "todo" as TaskStatus,
          estimatedTime: t.estimated_time_label ?? undefined,
          actionLink: t.action_link ?? undefined,
          parentId: taskId,
        }));
        const parentIndex = withoutOldSubtasks.findIndex((t) => t.id === taskId);
        const result = [...withoutOldSubtasks];
        result.splice(parentIndex + 1, 0, ...newTaskItems);
        return result;
      });
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

  const todayStr = useMemo(() => getTodayStr(), []);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.scheduledDate === todayStr),
    [tasks, todayStr]
  );

  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.scheduledDate && t.scheduledDate > todayStr),
    [tasks, todayStr]
  );

  const somedayTasks = useMemo(
    () => tasks.filter((t) => !t.scheduledDate && !t.parentId),
    [tasks]
  );

  return {
    tasks,
    isLoading: isLoading || isFetching,
    isBreakingDown: isLoading,
    completedCount,
    streakDays,
    todayTasks,
    scheduledTasks,
    somedayTasks,
    breakdownTask,
    editBreakdown,
    toggleTask,
    changeTaskStatus,
    deleteTask,
    undoDelete,
    editTask,
    reorderTasks,
    clearCompleted,
    importFromRoadmap,
    scheduleTask,
    unscheduleTask,
  };
}
