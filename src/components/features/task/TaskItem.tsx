"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Compass, X, GripVertical, Pencil, Play, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  isCompleted?: boolean; // Deprecated: use status instead
  subTasks?: Task[];
  actionLink?: string;
  estimatedTime?: string;
  linkedGoal?: string;
  linkedRoadmapId?: string;
  linkedMilestoneId?: string;
  parentId?: string;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onChangeStatus?: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newTitle: string) => void;
  index?: number;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, x: -80, transition: { duration: 0.2 } },
};

export function TaskItem({
  task,
  onToggle,
  onChangeStatus,
  onDelete,
  onEdit,
  index = 0,
  onDragStart,
  onDragOver,
  onDragEnd,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subTasks = task.subTasks ?? [];
  const hasSubtasks = subTasks.length > 0;
  const totalSubtasks = subTasks.length;
  const completedSubtasks = subTasks.filter(
    (st) => st.status === "done" || st.status === "canceled"
  ).length;
  const progressPercentage = hasSubtasks ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const isAllSubtasksCompleted = hasSubtasks && completedSubtasks === totalSubtasks;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    if (editValue.trim()) {
      onEdit(task.id, editValue);
    } else {
      setEditValue(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEditSubmit();
    if (e.key === "Escape") {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      layout
      layoutId={`task-${task.id}`}
      variants={itemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      custom={index}
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(index);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group p-3 rounded-2xl w-full",
        "glass hover:glass-hover transition-colors duration-300",
        task.status === "done" && "opacity-50 grayscale",
        task.status === "in_progress" &&
          "border-primary/50 shadow-[0_0_15px_rgba(var(--foreground-rgb),0.1)] ring-1 ring-primary/20",
        task.status === "canceled" && "opacity-40 grayscale line-through"
      )}
      whileHover={{ y: -2 }}
      transition={springTransition}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {onDragStart && (
          <div className="mt-1.5 flex-shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Toggle button */}
        <motion.button
          onClick={() => onToggle(task.id)}
          aria-label={task.status === "done" ? "タスクを未完了に戻す" : "タスクを完了する"}
          className="mt-1 relative flex items-center justify-center w-6 h-6 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          whileTap={{ scale: 0.8 }}
          transition={springTransition}
        >
          {hasSubtasks ? (
            <>
              <svg className="w-6 h-6 -rotate-90 transform" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-20"
                />
                <motion.circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "50.265", strokeDashoffset: "50.265" }}
                  animate={{
                    strokeDashoffset: 50.265 - (50.265 * progressPercentage) / 100,
                  }}
                  transition={{ ...springTransition, duration: 0.5 }}
                  className={cn(
                    "opacity-90 transition-colors duration-300",
                    task.status === "in_progress"
                      ? "text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                      : "",
                    isAllSubtasksCompleted && task.status !== "done" ? "text-primary" : ""
                  )}
                />
              </svg>
              {(task.status === "done" || isAllSubtasksCompleted) && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center text-foreground"
                >
                  <CheckCircle2 className="w-6 h-6" />
                </motion.div>
              )}
            </>
          ) : task.status === "done" ? (
            <CheckCircle2 className="w-6 h-6 text-foreground" />
          ) : (
            <Circle
              className={cn(
                "w-6 h-6",
                task.status === "in_progress" && "text-primary opacity-60",
                task.status === "canceled" && "opacity-30"
              )}
            />
          )}
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={handleKeyDown}
                aria-label={`タスク「${task.title}」を編集`}
                className="flex-1 bg-transparent border-b border-foreground/20 outline-none text-base sm:text-lg font-medium tracking-tight py-0.5"
              />
            ) : (
              <h3
                onDoubleClick={() => {
                  if (task.status !== "done" && task.status !== "canceled") {
                    setEditValue(task.title);
                    setIsEditing(true);
                  }
                }}
                className={cn(
                  "text-base sm:text-lg font-medium tracking-tight cursor-default",
                  (task.status === "done" || task.status === "canceled") &&
                    "line-through text-muted-foreground",
                  task.status === "in_progress" && "text-foreground"
                )}
              >
                {task.title}
              </h3>
            )}
            {task.linkedGoal &&
              task.status !== "done" &&
              task.status !== "canceled" && (
                <div className="group/tooltip relative flex-shrink-0">
                  <Compass className="w-4 h-4 text-compass/60" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-popover text-popover-foreground text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none border border-compass-border shadow-lg flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-compass/80 flex-shrink-0" />
                    {task.linkedGoal}
                  </div>
                </div>
              )}
          </div>

          {/* Bottom row: metadata + actions */}
          {task.status !== "canceled" && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Metadata badges */}
              {task.status !== "done" && (
                <>
                  {hasSubtasks && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors",
                        isAllSubtasksCompleted
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-secondary/30 border-secondary-foreground/10 text-muted-foreground"
                      )}
                    >
                      <svg
                        className="w-3.5 h-3.5 opacity-70"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>
                        {completedSubtasks}/{totalSubtasks} サブタスク
                      </span>
                    </div>
                  )}
                  {task.estimatedTime && (
                    <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-md text-xs text-muted-foreground">
                      <span className="opacity-70">⏱</span> {task.estimatedTime}
                    </span>
                  )}
                  {task.actionLink && (
                    <a
                      href={task.actionLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors text-xs font-medium"
                    >
                      <span className="opacity-70">↗</span> Link
                    </a>
                  )}
                  {hasSubtasks && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "サブタスクを隠す" : "サブタスクを表示"}
                      className="flex items-center gap-1.5 bg-secondary/30 px-2 py-0.5 rounded-md hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
                    >
                      <span>{isExpanded ? "閉じる" : "詳細"}</span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </motion.div>
                    </button>
                  )}
                </>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Action buttons */}
              {!isEditing && (
                <>
                  {task.status === "todo" && onChangeStatus && (
                    <motion.button
                      onClick={() => onChangeStatus(task.id, "in_progress")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-xs tracking-wide"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={springTransition}
                      title="開始する"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">START</span>
                    </motion.button>
                  )}
                  {task.status === "in_progress" && onChangeStatus && (
                    <motion.button
                      onClick={() => onChangeStatus(task.id, "todo")}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      whileTap={{ scale: 0.9 }}
                      transition={springTransition}
                      title="Todoに戻す"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  {task.status !== "done" && (
                    <motion.button
                      onClick={() => {
                        setEditValue(task.title);
                        setIsEditing(true);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      whileTap={{ scale: 0.9 }}
                      transition={springTransition}
                      title="編集"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/20 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    whileTap={{ scale: 0.9 }}
                    transition={springTransition}
                    title="削除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks Accordion */}
      <AnimatePresence>
        {isExpanded && hasSubtasks && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden pl-10 pr-2 border-l-2 border-white/5 ml-3"
          >
            <div className="flex flex-col gap-2">
              {subTasks.map((subTask) => (
                <div key={subTask.id} className="relative">
                  <TaskItem
                    task={subTask}
                    onToggle={onToggle}
                    onChangeStatus={onChangeStatus}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                  <div className="absolute left-[-26px] top-1/2 w-4 h-px bg-white/10" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
