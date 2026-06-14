"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springTransition } from "@/lib/motion";

interface StreakMilestoneOverlayProps {
  milestone: 7 | 30 | null;
  onDismiss: () => void;
}

const MILESTONE_MESSAGES: Record<7 | 30, { emoji: string; title: string; subtitle: string }> = {
  7: {
    emoji: "🔥",
    title: "7日連続達成！",
    subtitle: "一週間、毎日積み上げました。この調子で続けよう。",
  },
  30: {
    emoji: "🏆",
    title: "30日連続達成！",
    subtitle: "一ヶ月間、毎日前進し続けました。あなたは本物です。",
  },
};

export function StreakMilestoneOverlay({ milestone, onDismiss }: StreakMilestoneOverlayProps) {
  useEffect(() => {
    if (!milestone) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [milestone, onDismiss]);

  const message = milestone ? MILESTONE_MESSAGES[milestone] : null;

  return (
    <AnimatePresence>
      {milestone && message && (
        <motion.div
          key={`milestone-${milestone}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={springTransition}
            className="flex flex-col items-center gap-4 px-10 py-10 rounded-3xl glass shadow-2xl text-center max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.span
              className="text-6xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            >
              {message.emoji}
            </motion.span>
            <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">
              {message.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message.subtitle}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">タップで閉じる</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
