"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StreakMilestoneOverlayProps {
  milestone: number | null;
  onDismiss: () => void;
}

export function StreakMilestoneOverlay({ milestone, onDismiss }: StreakMilestoneOverlayProps) {
  useEffect(() => {
    if (!milestone) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [milestone, onDismiss]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-foreground/5 border border-foreground/10"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="text-6xl"
            >
              🔥
            </motion.span>
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-foreground">
                {milestone}日連続達成！
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                素晴らしい習慣が身についています
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
