"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { springTransition } from "@/lib/motion";
import type { UndoState } from "@/hooks/useTasks";

interface UndoToastProps {
  undoState: UndoState | null;
  onUndo: () => void;
}

const DURATION_S = 5;

export function UndoToast({ undoState, onUndo }: UndoToastProps) {
  const visible = undoState !== null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={undoState?.taskId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={springTransition}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col overflow-hidden rounded-2xl glass shadow-lg border border-foreground/10 min-w-[260px]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-foreground/60 flex-shrink-0" />
            <p className="text-sm font-medium flex-1 text-foreground">完了しました</p>
            <button
              onClick={onUndo}
              className="text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              元に戻す
            </button>
          </div>
          <div className="h-0.5 bg-foreground/10">
            <motion.div
              key={undoState?.taskId}
              className="h-full bg-foreground/40"
              style={{ originX: 0 }}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: DURATION_S, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
