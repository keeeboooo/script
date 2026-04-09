"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, TaskItem, TaskStatus } from "./TaskItem";
import { SchedulingPicker } from "./SchedulingPicker";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";
import { getTodayStr } from "@/lib/date";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onChangeTaskStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
  onEditBreakdown?: (taskId: string, instruction: string) => Promise<void>;
  onScheduleTask?: (id: string, date: string, time?: string) => void;
  onUnscheduleTask?: (id: string) => void;
  /** ID of the task that just had Breakdown run — shows inline SchedulingPicker */
  newlyBreakdownTaskId?: string | null;
  onDismissSchedulingPrompt?: () => void;
}

interface TaskWithIndex extends Task {
  originalIndex: number;
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function TaskList({
  tasks,
  onToggleTask,
  onChangeTaskStatus,
  onDeleteTask,
  onEditTask,
  onReorderTasks,
  onEditBreakdown,
  onScheduleTask,
  onUnscheduleTask,
  newlyBreakdownTaskId,
  onDismissSchedulingPrompt,
}: TaskListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"project" | "today">("project");

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      onReorderTasks(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, onReorderTasks]);

  const tasksWithIndex: TaskWithIndex[] = useMemo(
    () => tasks.map((task, index) => ({ ...task, originalIndex: index })),
    [tasks]
  );

  const todayStr = useMemo(() => getTodayStr(), []);

  const processedTasks: TaskWithIndex[] = useMemo(() => {
    if (viewMode === "project") {
      return tasksWithIndex
        .filter((t) => !t.parentId)
        .map((t) => ({
          ...t,
          subTasks: tasksWithIndex.filter((st) => st.parentId === t.id),
        }));
    }
    // Today mode: flat list of leaf tasks (no parents)
    return tasksWithIndex
      .filter((t) => {
        const isParent = tasksWithIndex.some((st) => st.parentId === t.id);
        return !isParent;
      })
      .map((t) => {
        if (t.parentId) {
          const parent = tasksWithIndex.find((p) => p.id === t.parentId);
          return { ...t, linkedGoal: parent?.title ?? t.linkedGoal };
        }
        return t;
      });
  }, [tasksWithIndex, viewMode]);

  // Project mode groups
  const inProgressTasks = useMemo(
    () => processedTasks.filter((t) => t.status === "in_progress"),
    [processedTasks]
  );
  const todoTasks = useMemo(
    () => processedTasks.filter((t) => t.status === "todo"),
    [processedTasks]
  );
  const doneTasks = useMemo(
    () => processedTasks.filter((t) => t.status === "done" || t.status === "canceled"),
    [processedTasks]
  );

  // Today mode: 3-bucket split
  const todayBucketTasks = useMemo(
    () => processedTasks.filter((t) => t.scheduledDate === todayStr && t.status !== "done" && t.status !== "canceled"),
    [processedTasks, todayStr]
  );
  const scheduledBucketTasks = useMemo(
    () => processedTasks.filter((t) => t.scheduledDate && t.scheduledDate > todayStr && t.status !== "done" && t.status !== "canceled"),
    [processedTasks, todayStr]
  );
  const somedayBucketTasks = useMemo(
    () => processedTasks.filter((t) => !t.scheduledDate && t.status !== "done" && t.status !== "canceled"),
    [processedTasks]
  );
  const doneBucketTasks = useMemo(
    () => processedTasks.filter((t) => t.status === "done" || t.status === "canceled"),
    [processedTasks]
  );

  if (tasks.length === 0) return null;

  const renderGroup = (
    groupTasks: TaskWithIndex[],
    title: string,
    showEmptyIfZero = false,
    compact = false,
    emptyMessage = "タスクはありません"
  ) => {
    if (groupTasks.length === 0 && !showEmptyIfZero) return null;

    return (
      <div className="flex flex-col gap-1.5 mb-3">
        <motion.div layout className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {title}{" "}
            <span className="text-xs ml-1 bg-secondary/30 px-2 py-0.5 rounded-full">
              {groupTasks.length}
            </span>
          </h2>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {groupTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              index={task.originalIndex}
              onToggle={onToggleTask}
              onChangeStatus={onChangeTaskStatus}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onEditBreakdown={onEditBreakdown}
              onScheduleTask={onScheduleTask}
              onUnscheduleTask={onUnscheduleTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isSubTask={compact}
            />
          ))}
          {groupTasks.length === 0 && showEmptyIfZero && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-8 rounded-2xl border border-dashed border-border/40 text-center text-sm text-muted-foreground"
            >
              {emptyMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col w-full max-w-2xl mx-auto mt-4 px-0 sm:px-2"
    >
      {/* View Toggle */}
      <div className="flex justify-center mb-3">
        <div className="flex p-1 bg-secondary/20 rounded-2xl glass">
          <button
            onClick={() => setViewMode("project")}
            aria-pressed={viewMode === "project"}
            className={cn(
              "px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300",
              viewMode === "project"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Projects
          </button>
          <button
            onClick={() => { setViewMode("today"); onDismissSchedulingPrompt?.(); }}
            aria-pressed={viewMode === "today"}
            className={cn(
              "px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300",
              viewMode === "today"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Today
          </button>
        </div>
      </div>

      {/* Breakdown直後のインラインスケジューリングプロンプト */}
      <AnimatePresence>
        {newlyBreakdownTaskId && viewMode === "project" && onScheduleTask && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={springTransition}
            className="mb-3"
          >
            <SchedulingPicker
              onSchedule={(date, time) => {
                onScheduleTask(newlyBreakdownTaskId, date, time);
                onDismissSchedulingPrompt?.();
              }}
              onSkip={() => onDismissSchedulingPrompt?.()}
              taskTitle={tasks.find((t) => t.id === newlyBreakdownTaskId)?.title}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === "project" ? (
        <>
          {renderGroup(inProgressTasks, "In Progress")}
          {renderGroup(todoTasks, "Todo")}
          {renderGroup(doneTasks, "Done")}
        </>
      ) : (
        <>
          {renderGroup(todayBucketTasks, "Today", true, true, "今日の予定はありません")}
          {renderGroup(scheduledBucketTasks, "Scheduled", false, true)}
          {renderGroup(somedayBucketTasks, "Someday", true, true, "いつかやるタスクはありません")}
          {renderGroup(doneBucketTasks, "Done", false, true)}
        </>
      )}
    </motion.div>
  );
}
