"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Task, TaskItem, TaskStatus } from "./TaskItem";
import { springTransition } from "@/lib/motion";
import { z } from "zod";

const NudgeSuggestionSchema = z.object({
  taskId: z.string(),
  reason: z.string(),
});

const NudgeResponseSchema = z.object({
  suggestions: z.array(NudgeSuggestionSchema),
});

interface SmartNudgeSuggestion {
  task: Task;
  reason: string;
}

interface SmartNudgeProps {
  incompleteTasks: Task[];
  allTasks: Task[];
  onToggleTask: (id: string) => void;
  onChangeTaskStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onEditBreakdown?: (taskId: string, instruction: string) => Promise<void>;
  onScheduleTask?: (id: string, date: string, time?: string) => void;
  onUnscheduleTask?: (id: string) => void;
}

export function SmartNudge({
  incompleteTasks,
  allTasks,
  onToggleTask,
  onChangeTaskStatus,
  onDeleteTask,
  onEditTask,
  onEditBreakdown,
  onScheduleTask,
  onUnscheduleTask,
}: SmartNudgeProps) {
  const [suggestions, setSuggestions] = useState<SmartNudgeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [taskCountAtLastFetch, setTaskCountAtLastFetch] = useState(0);

  const fetchNudge = useCallback(async () => {
    if (incompleteTasks.length === 0) return;

    setIsLoading(true);
    try {
      const payload = incompleteTasks.slice(0, 30).map((t) => {
        const parent = t.parentId ? allTasks.find((p) => p.id === t.parentId) : undefined;
        return {
          id: t.id,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          parentTitle: parent?.title,
          linkedGoal: t.linkedGoal,
        };
      });

      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: payload }),
      });

      if (!res.ok) return;

      const data: unknown = await res.json();
      const parsed = NudgeResponseSchema.safeParse(data);
      if (!parsed.success) return;

      const resolved = parsed.data.suggestions
        .map((s) => {
          const task = allTasks.find((t) => t.id === s.taskId);
          if (!task) return null;
          return { task, reason: s.reason };
        })
        .filter((s): s is SmartNudgeSuggestion => s !== null);

      setSuggestions(resolved);
      setTaskCountAtLastFetch(incompleteTasks.length);
    } catch {
      // silently fail — nudge is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [incompleteTasks, allTasks]);

  // Fetch on mount and when task count changes meaningfully (completion events)
  useEffect(() => {
    const countChanged = Math.abs(incompleteTasks.length - taskCountAtLastFetch) >= 1;
    if (suggestions.length === 0 || countChanged) {
      void fetchNudge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incompleteTasks.length]);

  // Filter out completed tasks from current suggestions
  const activeSuggestions = suggestions.filter(
    (s) => s.task.status !== "done" && s.task.status !== "canceled" && incompleteTasks.some((t) => t.id === s.task.id)
  );

  if (incompleteTasks.length === 0) return null;

  const visibleSuggestions = showAll ? activeSuggestions : activeSuggestions.slice(0, 3);
  const hiddenCount = activeSuggestions.length - 3;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            AIおすすめ
          </span>
        </div>
        <motion.button
          onClick={() => void fetchNudge()}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
          title="おすすめを更新"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "更新"
          )}
        </motion.button>
      </div>

      {/* Loading skeleton */}
      <AnimatePresence>
        {isLoading && activeSuggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-2xl glass animate-pulse bg-secondary/20" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions */}
      <AnimatePresence>
        {visibleSuggestions.map((s) => (
          <motion.div
            key={s.task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springTransition}
            className="flex flex-col gap-1"
          >
            <TaskItem
              task={s.task}
              onToggle={onToggleTask}
              onChangeStatus={onChangeTaskStatus}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onEditBreakdown={onEditBreakdown}
              onScheduleTask={onScheduleTask}
              onUnscheduleTask={onUnscheduleTask}
              isSubTask
            />
            <p className="text-xs text-muted-foreground/70 pl-3 pb-0.5">
              {s.reason}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show more / less */}
      {activeSuggestions.length > 3 && (
        <motion.button
          onClick={() => setShowAll((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-secondary/50 self-start"
          whileTap={{ scale: 0.97 }}
          transition={springTransition}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" />
              折りたたむ
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              残り{hiddenCount}件を表示
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
