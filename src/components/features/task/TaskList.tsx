"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Task, TaskItem, TaskStatus } from "./TaskItem";
import { SmartNudge } from "./SmartNudge";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { SchedulingPicker } from "./SchedulingPicker";
import { cn } from "@/lib/utils";
import { springTransition, STAGGER_FAST } from "@/lib/motion";
import { getTodayStr } from "@/lib/date";
import type { Roadmap } from "@/hooks/useCompass";
import type { List } from "@/hooks/useLists";
import { Plus } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  roadmaps?: Roadmap[];
  lists?: List[];
  onCreateList?: (name: string) => Promise<void>;
  selectedListId?: string | null;
  onSelectList?: (id: string | null) => void;
  onToggleTask: (id: string) => void;
  onChangeTaskStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onReorderTasks: (fromId: string, toId: string) => void;
  onEditBreakdown?: (taskId: string, instruction: string) => Promise<void>;
  onLinkRoadmap?: (taskId: string, roadmapId: string | null, roadmapTitle: string | null) => void;
  onAssignList?: (taskId: string, listId: string | null) => void;
  onScheduleTask?: (id: string, date: string, time?: string) => void;
  onUnscheduleTask?: (id: string) => void;
  /** ID of the task that just had Breakdown run — shows inline SchedulingPicker */
  newlyBreakdownTaskId?: string | null;
  onDismissSchedulingPrompt?: () => void;
  streakDays?: number;
  streakIsAtRisk?: boolean;
  availableFreezes?: number;
  onStreakFreeze?: () => void;
}

interface TaskWithIndex extends Task {
  originalIndex: number;
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_FAST,
    },
  },
};

export function TaskList({
  tasks,
  roadmaps = [],
  lists = [],
  onCreateList,
  selectedListId = null,
  onSelectList,
  onToggleTask,
  onChangeTaskStatus,
  onDeleteTask,
  onEditTask,
  onLinkRoadmap,
  onAssignList,
  onReorderTasks,
  onEditBreakdown,
  onScheduleTask,
  onUnscheduleTask,
  newlyBreakdownTaskId,
  onDismissSchedulingPrompt,
  streakDays = 0,
  streakIsAtRisk = false,
  availableFreezes = 0,
  onStreakFreeze,
}: TaskListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"project" | "today">("project");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const isSubmittingListRef = useRef(false);

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setOverId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragId !== null && overId !== null && dragId !== overId) {
      onReorderTasks(dragId, overId);
    }
    setDragId(null);
    setOverId(null);
  }, [dragId, overId, onReorderTasks]);

  const tasksWithIndex: TaskWithIndex[] = useMemo(
    () => tasks.map((task, index) => ({ ...task, originalIndex: index })),
    [tasks]
  );

  const todayStr = useMemo(() => getTodayStr(), []);

  const sortTodayViewTasks = useCallback((list: TaskWithIndex[]): TaskWithIndex[] => {
    return [...list].sort((a, b) => {
      const timeA = a.scheduledTime ?? "￿";
      const timeB = b.scheduledTime ?? "￿";
      if (timeA !== timeB) return timeA < timeB ? -1 : 1;
      const minA = a.estimatedMinutes ?? Infinity;
      const minB = b.estimatedMinutes ?? Infinity;
      return minA - minB;
    });
  }, []);

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

  // Projects モード: Listタブで絞り込まれた親タスク一覧
  const filteredProjectTasks = useMemo(() => {
    if (viewMode !== "project") return processedTasks;
    if (selectedListId === null) return processedTasks; // All
    return processedTasks.filter((t) => t.listId === selectedListId);
  }, [processedTasks, viewMode, selectedListId]);

  // Project mode: Roadmapごとのグループ
  const roadmapGroups = useMemo(() => {
    const activeTasks = processedTasks.filter(
      (t) => t.status !== "done" && t.status !== "canceled"
    );
    const doneTasks = processedTasks.filter(
      (t) => t.status === "done" || t.status === "canceled"
    );

    // linkedRoadmapId を持つタスクをRoadmap別に分類
    const groups: { roadmap: Roadmap; tasks: TaskWithIndex[] }[] = roadmaps.map(
      (roadmap) => ({
        roadmap,
        tasks: activeTasks.filter((t) => t.linkedRoadmapId === roadmap.id),
      })
    ).filter((g) => g.tasks.length > 0);

    // Roadmapに紐づかないタスク
    const linkedRoadmapIds = new Set(roadmaps.map((r) => r.id));
    const unlinkedTasks = activeTasks.filter(
      (t) => !t.linkedRoadmapId || !linkedRoadmapIds.has(t.linkedRoadmapId)
    );

    return { groups, unlinkedTasks, doneTasks };
  }, [processedTasks, roadmaps]);

  // Today mode: 3-bucket split
  const todayBucketTasks = useMemo(
    () => sortTodayViewTasks(processedTasks.filter((t) => t.scheduledDate === todayStr && t.status !== "done" && t.status !== "canceled")),
    [processedTasks, todayStr, sortTodayViewTasks]
  );
  const scheduledBucketTasks = useMemo(
    () => processedTasks.filter((t) => t.scheduledDate && t.scheduledDate > todayStr && t.status !== "done" && t.status !== "canceled"),
    [processedTasks, todayStr]
  );
  const somedayBucketTasks = useMemo(
    () => sortTodayViewTasks(processedTasks.filter((t) => !t.scheduledDate && t.status !== "done" && t.status !== "canceled")),
    [processedTasks, sortTodayViewTasks]
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
    emptyMessage = "タスクはありません",
    groupKey?: string,
    defaultLimit?: number
  ) => {
    if (groupTasks.length === 0 && !showEmptyIfZero) return null;

    const isExpanded = groupKey ? expandedGroups.has(groupKey) : true;
    const hasLimit = groupKey !== undefined && defaultLimit !== undefined && groupTasks.length > defaultLimit;
    const visibleTasks = hasLimit && !isExpanded ? groupTasks.slice(0, defaultLimit) : groupTasks;
    const hiddenCount = hasLimit ? groupTasks.length - defaultLimit : 0;

    const toggleExpand = () => {
      if (!groupKey) return;
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(groupKey)) {
          next.delete(groupKey);
        } else {
          next.add(groupKey);
        }
        return next;
      });
    };

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

        <AnimatePresence>
          {visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              roadmaps={roadmaps}
              lists={lists}
              index={task.originalIndex}
              onToggle={onToggleTask}
              onChangeStatus={onChangeTaskStatus}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onEditBreakdown={onEditBreakdown}
              onLinkRoadmap={onLinkRoadmap}
              onAssignList={onAssignList}
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

        {hasLimit && (
          <motion.button
            layout
            onClick={toggleExpand}
            transition={springTransition}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/30 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                折りたたむ
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                他 {hiddenCount} 件を表示
              </>
            )}
          </motion.button>
        )}
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
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex p-1 bg-secondary/20 rounded-2xl glass">
          <button
            onClick={() => { setViewMode("project"); setExpandedGroups(new Set()); }}
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
            onClick={() => { setViewMode("today"); setExpandedGroups(new Set()); onDismissSchedulingPrompt?.(); }}
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
        <StreakBadge
          days={streakDays}
          isAtRisk={streakIsAtRisk}
          availableFreezes={availableFreezes}
          onFreeze={onStreakFreeze}
        />
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
          {/* Listタブ — Projects配下のフィルター（上段モード切り替えより一段小さく） */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none pl-1">
            <div className="flex p-0.5 bg-muted rounded-xl flex-shrink-0">
              <button
                onClick={() => onSelectList?.(null)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 outline-none",
                  selectedListId === null
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => onSelectList?.(list.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 outline-none",
                    selectedListId === list.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {list.name}
                </button>
              ))}
            </div>

            {isCreatingList ? (
              <motion.input
                autoFocus
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "8rem" }}
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newListName.trim()) {
                    isSubmittingListRef.current = true;
                    await onCreateList?.(newListName.trim());
                    setNewListName("");
                    setIsCreatingList(false);
                    isSubmittingListRef.current = false;
                  }
                  if (e.key === "Escape") {
                    setNewListName("");
                    setIsCreatingList(false);
                  }
                }}
                onBlur={() => {
                  if (isSubmittingListRef.current) return;
                  setNewListName("");
                  setIsCreatingList(false);
                }}
                placeholder="List名"
                className="flex-shrink-0 bg-secondary/20 glass border-none rounded-2xl px-4 py-2 text-xs sm:text-sm outline-none"
              />
            ) : (
              <motion.button
                onClick={() => setIsCreatingList(true)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors outline-none"
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
              >
                <Plus className="w-3 h-3" />
                List
              </motion.button>
            )}
          </div>

          {/* Roadmapごとのグループ */}
          {roadmapGroups.groups
            .map(({ roadmap, tasks: groupTasks }) => {
              const filtered = selectedListId
                ? groupTasks.filter((t) => t.listId === selectedListId)
                : groupTasks;
              if (filtered.length === 0) return null;
              const label = roadmap.title ?? roadmap.goal;
              return (
                <div key={roadmap.id} className="flex flex-col gap-1.5 mb-3">
                  <motion.div layout className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-semibold tracking-wide text-compass flex items-center gap-2 line-clamp-1">
                      {label}
                    </h2>
                  </motion.div>
                  <AnimatePresence>
                    {filtered.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        roadmaps={roadmaps}
                        lists={lists}
                        index={task.originalIndex}
                        onToggle={onToggleTask}
                        onChangeStatus={onChangeTaskStatus}
                        onDelete={onDeleteTask}
                        onEdit={onEditTask}
                        onEditBreakdown={onEditBreakdown}
                        onLinkRoadmap={onLinkRoadmap}
                        onAssignList={onAssignList}
                        onScheduleTask={onScheduleTask}
                        onUnscheduleTask={onUnscheduleTask}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}

          {/* Roadmapに紐づかないタスク */}
          {renderGroup(
            selectedListId
              ? roadmapGroups.unlinkedTasks.filter((t) => t.listId === selectedListId)
              : roadmapGroups.unlinkedTasks,
            "その他"
          )}

          {/* 完了済み */}
          {renderGroup(roadmapGroups.doneTasks, "Done")}
        </>
      ) : (
        <>
          <SmartNudge
            incompleteTasks={processedTasks.filter((t) => t.status !== "done" && t.status !== "canceled")}
            allTasks={tasks}
            onToggleTask={onToggleTask}
            onChangeTaskStatus={onChangeTaskStatus}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
            onEditBreakdown={onEditBreakdown}
            onScheduleTask={onScheduleTask}
            onUnscheduleTask={onUnscheduleTask}
          />
          {renderGroup(todayBucketTasks, "Today", true, true, "今日の予定はありません", "today", 3)}
          {renderGroup(scheduledBucketTasks, "Scheduled", false, true)}
          {renderGroup(somedayBucketTasks, "Someday", true, true, "いつかやるタスクはありません", "someday", 3)}
          {renderGroup(doneBucketTasks, "Done", false, true)}
        </>
      )}
    </motion.div>
  );
}
