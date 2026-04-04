"use client";

import { TaskInput } from "@/components/features/task/TaskInput";
import { TaskList } from "@/components/features/task/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Sparkles } from "lucide-react";

const springTransition = { type: "spring" as const, stiffness: 260, damping: 20 };

export default function Home() {
  const {
    tasks,
    breakdownTask,
    editBreakdown,
    toggleTask,
    changeTaskStatus,
    deleteTask,
    editTask,
    reorderTasks,
    clearCompleted,
    isLoading,
    isBreakingDown,
    completedCount,
  } = useTasks();

  return (
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
        <TaskInput onSubmit={breakdownTask} isLoading={isLoading} />

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
              onToggleTask={toggleTask}
              onChangeTaskStatus={changeTaskStatus}
              onDeleteTask={deleteTask}
              onEditTask={editTask}
              onReorderTasks={reorderTasks}
              onEditBreakdown={editBreakdown}
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
  );
}
