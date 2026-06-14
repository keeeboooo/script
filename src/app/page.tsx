"use client";

import { useState, useCallback } from "react";
import { TaskInput } from "@/components/features/task/TaskInput";
import { TaskList } from "@/components/features/task/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { useRoadmaps } from "@/hooks/useRoadmaps";
import { useLists } from "@/hooks/useLists";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StreakMilestoneOverlay } from "@/components/ui/StreakMilestoneOverlay";

const springTransition = { type: "spring" as const, stiffness: 260, damping: 20 };

export default function Home() {
  const [lastBreakdownTaskId, setLastBreakdownTaskId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const roadmaps = useRoadmaps();
  const { lists, createList } = useLists();

  const {
    tasks,
    addTask,
    assignTaskToList,
    breakdownTask,
    editBreakdown,
    linkTaskToRoadmap,
    toggleTask,
    changeTaskStatus,
    deleteTask,
    undoDelete,
    editTask,
    reorderTasks,
    clearCompleted,
    isLoading,
    isBreakingDown,
    completedCount,
    streakDays,
    streakIsAtRisk,
    streakMilestone,
    availableFreezes,
    scheduleTask,
    unscheduleTask,
    applyStreakFreeze,
    clearStreakMilestone,
  } = useTasks();

  const handleBreakdown = async (prompt: string) => {
    const newParentId = await breakdownTask(prompt);
    if (newParentId) {
      setLastBreakdownTaskId(newParentId);
    }
  };

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask(id);
    toast("タスクを削除しました", {
      action: { label: "元に戻す", onClick: () => undoDelete(id) },
      duration: 5000,
    });
  }, [deleteTask, undoDelete]);

  return (
    <>
    <StreakMilestoneOverlay milestone={streakMilestone} onDismiss={clearStreakMilestone} />
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-4 pt-2 sm:pt-4">
      <div className="text-center space-y-1">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
          Follow the Script.
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          AIがタスクを実行可能なステップに分解します。
        </p>
      </div>

      <div className="w-full relative z-10">
        <TaskInput onSubmit={handleBreakdown} onAdd={addTask} selectedListId={selectedListId} isLoading={isLoading} />

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4 w-full mt-12"
          >
            {isBreakingDown && (
              <motion.div
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4" />
                AIがタスクを分解中...
              </motion.div>
            )}
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full glass rounded-2xl animate-pulse bg-secondary/20" />
            ))}
          </motion.div>
        )}

        {!isLoading && (
          <>
            <TaskList
              tasks={tasks}
              roadmaps={roadmaps}
              lists={lists}
              onCreateList={async (name) => { await createList(name); }}
              selectedListId={selectedListId}
              onSelectList={setSelectedListId}
              onToggleTask={toggleTask}
              onChangeTaskStatus={changeTaskStatus}
              onDeleteTask={handleDeleteTask}
              onEditTask={editTask}
              onLinkRoadmap={linkTaskToRoadmap}
              onAssignList={assignTaskToList}
              onReorderTasks={reorderTasks}
              onEditBreakdown={editBreakdown}
              onScheduleTask={scheduleTask}
              onUnscheduleTask={unscheduleTask}
              newlyBreakdownTaskId={lastBreakdownTaskId}
              onDismissSchedulingPrompt={() => setLastBreakdownTaskId(null)}
              streakDays={streakDays}
              streakIsAtRisk={streakIsAtRisk}
              availableFreezes={availableFreezes}
              onStreakFreeze={applyStreakFreeze}
            />

            {/* Bulk action bar */}
            <AnimatePresence>
              {completedCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={springTransition}
                  className="flex items-center justify-center mt-6"
                >
                  <motion.button
                    onClick={clearCompleted}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground glass hover:glass-hover transition-colors"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springTransition}
                  >
                    <Trash2 className="w-4 h-4" />
                    完了済みをクリア ({completedCount})
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
    </>
  );
}
