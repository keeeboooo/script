"use client";

import { motion } from "framer-motion";
import { springTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  days: number;
  className?: string;
  isAtRisk?: boolean;
  availableFreezes?: number;
  onFreeze?: () => void;
}

export function StreakBadge({
  days,
  className,
  isAtRisk = false,
  availableFreezes = 0,
  onFreeze,
}: StreakBadgeProps) {
  const isActive = days > 0;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
          isActive && isAtRisk
            ? "bg-amber-100/60 border border-amber-300/40 text-foreground"
            : isActive
              ? "bg-primary/10 border border-primary/20 text-foreground"
              : "bg-secondary/30 border border-foreground/10 text-muted-foreground",
          className
        )}
        whileHover={{ y: -1 }}
        transition={springTransition}
        title={
          isActive && isAtRisk
            ? "今日タスクを完了してStreakを守ろう！"
            : isActive
              ? `${days}日連続でタスクを完了しています`
              : "今日タスクを完了して連続記録を始めよう"
        }
      >
        <span
          className={cn(
            "text-sm",
            isActive ? "opacity-100" : "opacity-40",
            isActive && isAtRisk && "animate-pulse"
          )}
        >
          🔥
        </span>
        {isActive ? (
          <span>
            <span className="font-bold text-sm">{days}</span>
            <span className="text-muted-foreground ml-0.5">日連続</span>
          </span>
        ) : (
          <span>連続記録を始めよう</span>
        )}
      </motion.div>

      {isActive && isAtRisk && availableFreezes > 0 && onFreeze && (
        <motion.button
          onClick={onFreeze}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-blue-100/60 border border-blue-300/40 text-blue-700 hover:bg-blue-200/60 transition-colors"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
          title={`Streak Freeze を使用 (残り${availableFreezes}回)`}
        >
          🧊 Freeze
        </motion.button>
      )}
    </div>
  );
}
