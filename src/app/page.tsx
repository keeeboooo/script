"use client";

import { TaskInput } from "@/components/features/task/TaskInput";
import { TaskList } from "@/components/features/task/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

const springTransition = { type: "spring" as const, stiffness: 260, damping: 20 };

export default function Home() {
  const {
    tasks,
    breakdownTask,
    toggleTask,
    changeTaskStatus,
    deleteTask,
    editTask,
    reorderTasks,
    clearCompleted,
    isLoading,
    completedCount,
  } = useTasks();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
          Follow the Script.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          達成したいことを入力すると、AIが実行可能なステップに分解します。
        </p>
      </div>

      <div className="w-full relative z-10">
        <TaskInput onSubmit={breakdownTask} isLoading={isLoading} />

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mt-12"
          >
            <div className="flex flex-col gap-4 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full glass rounded-2xl animate-pulse bg-secondary/20" />
              ))}
            </div>
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
