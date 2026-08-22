"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, Loader2, Compass } from "lucide-react";
import { Task, TaskItem, TaskStatus } from "./TaskItem";
import { springTransition } from "@/lib/motion";
import { NudgeCacheSchema, NudgeResponseSchema } from "@/lib/schemas";
import { getTodayStr } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";

const CACHE_KEY = "smart_nudge_cache";
const CACHE_KEY_PHILOSOPHY = "smart_nudge_philosophy_cache";

interface PhilosophyValue {
  name: string;
  description: string;
}

interface SmartNudgeSuggestion {
  task: Task;
  reason: string;
  alignedValue: string | undefined;
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

function loadCache(allTasks: Task[], cacheKey: string): SmartNudgeSuggestion[] | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = NudgeCacheSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.date !== getTodayStr()) return null;

    const resolved = parsed.data.suggestions
      .map((s) => {
        const task = allTasks.find((t) => t.id === s.taskId);
        if (!task) return null;
        return { task, reason: s.reason, alignedValue: s.alignedValue };
      })
      .filter((s): s is SmartNudgeSuggestion => s !== null);

    return resolved.length > 0 ? resolved : null;
  } catch {
    return null;
  }
}

function saveCache(suggestions: SmartNudgeSuggestion[], cacheKey: string) {
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        date: getTodayStr(),
        suggestions: suggestions.map((s) => ({
          taskId: s.task.id,
          reason: s.reason,
          alignedValue: s.alignedValue,
        })),
      })
    );
  } catch {
    // localStorage unavailable — ignore
  }
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
  const [philosophyMode, setPhilosophyMode] = useState(false);
  const [activeValues, setActiveValues] = useState<PhilosophyValue[]>([]);
  const initialized = useRef(false);

  // アクティブな哲学の価値観をマウント時に取得
  useEffect(() => {
    const fetchActiveValues = async () => {
      try {
        const supabase = createClient();
        const { data: philosophies } = await supabase
          .from("philosophies")
          .select("id, philosophy_values(name, description)")
          .eq("is_active", true)
          .limit(1);

        if (!philosophies || philosophies.length === 0) return;

        const first = philosophies[0] as {
          id: string;
          philosophy_values: { name: string; description: string }[];
        };
        const values = first.philosophy_values ?? [];
        if (values.length > 0) {
          setActiveValues(values);
        }
      } catch {
        // non-critical — ignore
      }
    };
    void fetchActiveValues();
  }, []);

  const currentCacheKey = philosophyMode ? CACHE_KEY_PHILOSOPHY : CACHE_KEY;

  const fetchNudge = useCallback(async () => {
    if (incompleteTasks.length === 0) return;

    setIsLoading(true);
    try {
      const taskPayload = incompleteTasks.slice(0, 30).map((t) => {
        const parent = t.parentId ? allTasks.find((p) => p.id === t.parentId) : undefined;
        return {
          id: t.id,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          parentTitle: parent?.title,
          linkedGoal: t.linkedGoal,
        };
      });

      const body: { tasks: typeof taskPayload; philosophyValues?: PhilosophyValue[] } = {
        tasks: taskPayload,
      };
      if (philosophyMode && activeValues.length > 0) {
        body.philosophyValues = activeValues;
      }

      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) return;

      const data: unknown = await res.json();
      const parsed = NudgeResponseSchema.safeParse(data);
      if (!parsed.success) return;

      const resolved = parsed.data.suggestions
        .map((s) => {
          const task = allTasks.find((t) => t.id === s.taskId);
          if (!task) return null;
          return { task, reason: s.reason, alignedValue: s.alignedValue };
        })
        .filter((s): s is SmartNudgeSuggestion => s !== null);

      setSuggestions(resolved);
      saveCache(resolved, currentCacheKey);
    } catch {
      // silently fail — nudge is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [incompleteTasks, allTasks, philosophyMode, activeValues, currentCacheKey]);

  // マウント時のみ: キャッシュがあれば使い、なければAPIを叩く
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const cached = loadCache(allTasks, CACHE_KEY);
    if (cached) {
      setSuggestions(cached);
    } else {
      void fetchNudge();
    }
  // allTasksとfetchNudgeはマウント時の値のみ使うため依存に含めない
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // philosophyModeが切り替わったときにキャッシュを確認して再取得
  const prevPhilosophyMode = useRef(philosophyMode);
  useEffect(() => {
    if (!initialized.current) return;
    if (prevPhilosophyMode.current === philosophyMode) return;
    prevPhilosophyMode.current = philosophyMode;

    const cached = loadCache(allTasks, currentCacheKey);
    if (cached) {
      setSuggestions(cached);
    } else {
      void fetchNudge();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [philosophyMode]);

  // 完了済みタスクをリアルタイムに除外
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
        <div className="flex items-center gap-2">
          {activeValues.length > 0 && (
            <motion.button
              onClick={() => setPhilosophyMode((prev) => !prev)}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                philosophyMode
                  ? "bg-compass/10 text-compass border-compass/30"
                  : "text-muted-foreground border-transparent hover:border-muted-foreground/30"
              }`}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              title="軸（価値観）で提案"
            >
              <Compass className="w-3 h-3" />
              軸で提案
            </motion.button>
          )}
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
              isSubTask={!!s.task.parentId}
            />
            <div className="flex items-center gap-2 pl-3 pb-0.5">
              <p className="text-xs text-muted-foreground/70 flex-1">
                {s.reason}
              </p>
              {s.alignedValue && (
                <span className="text-xs text-compass shrink-0 flex items-center gap-0.5">
                  <span className="opacity-60">✦</span>
                  {s.alignedValue}
                </span>
              )}
            </div>
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
