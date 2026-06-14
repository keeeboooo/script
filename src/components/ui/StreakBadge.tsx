"use client";

import { motion } from "framer-motion";
import { springTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  days: number;
  isAtRisk?: boolean;
  availableFreezes?: number;
  onFreeze?: () => void;
  className?: string;
}

export function StreakBadge({
  days,
  isAtRisk = false,
  availableFreezes = 0,
  onFreeze,
  className,
}: StreakBadgeProps) {
  const isActive = days > 0;
  const canFreeze = isAtRisk && availableFreezes > 0 && onFreeze;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
          isAtRisk
            ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 animate-pulse"
            : isActive
            ? "bg-primary/10 border border-primary/20 text-foreground"
            : "bg-secondary/30 border border-foreground/10 text-muted-foreground"
        )}
        whileHover={{ y: -1 }}
        transition={springTransition}
        title={
          isAtRisk
            ? "今日タスクを完了しないとStreakが途切れます！"
            : isActive
            ? `${days}日連続でタスクを完了しています`
            : "今日タスクを完了して連続記録を始めよう"
        }
      >
        <span className={cn("text-sm", isActive ? "opacity-100" : "opacity-40")}>
          {isAtRisk ? "⚠️" : "🔥"}
        </span>
        {isActive ? (
          <span>
            <span className="font-bold text-sm">{days}</span>
            <span className={cn("ml-0.5", isAtRisk ? "text-amber-700/70" : "text-muted-foreground")}>
              日連続
            </span>
          </span>
        ) : (
          <span>連続記録を始めよう</span>
        )}
      </motion.div>

      {canFreeze && (
        <motion.button
          onClick={onFreeze}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-sky-500/15 border border-sky-500/30 text-sky-700 hover:bg-sky-500/25 transition-colors"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
          title={`Streak Freeze を使う（残り${availableFreezes}回）`}
        >
          🧊 <span className="hidden sm:inline">Freeze</span>
          <span className="text-sky-700/60 text-xs">×{availableFreezes}</span>
        </motion.button>
      )}
    </div>
  );
}
