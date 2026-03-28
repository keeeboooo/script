"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, TaskItem, TaskStatus } from "./TaskItem";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onChangeTaskStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
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

  const processedTasks: TaskWithIndex[] = useMemo(() => {
    if (viewMode === "project") {
      return tasksWithIndex
        .filter((t) => !t.parentId)
        .map((t) => ({
          ...t,
          subTasks: tasksWithIndex.filter((st) => st.parentId === t.id),
        }));
    }
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

  if (tasks.length === 0) return null;

  const renderGroup = (
    groupTasks: TaskWithIndex[],
    title: string,
    showEmptyIfZero = false,
    compact = false
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
              実行中のタスクはありません
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
            onClick={() => setViewMode("today")}
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

      {renderGroup(inProgressTasks, "In Progress", false, viewMode === "today")}
      {renderGroup(todoTasks, "Todo", false, viewMode === "today")}
      {renderGroup(doneTasks, "Done", false, viewMode === "today")}
    </motion.div>
  );
}
