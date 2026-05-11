"use client";

import { motion } from "framer-motion";
import { springTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  days: number;
  className?: string;
}

export function StreakBadge({ days, className }: StreakBadgeProps) {
  const isActive = days > 0;

  return (
    <motion.div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
        isActive
          ? "bg-primary/10 border border-primary/20 text-foreground"
          : "bg-secondary/30 border border-foreground/10 text-muted-foreground",
        className
      )}
      whileHover={{ y: -1 }}
      transition={springTransition}
      title={isActive ? `${days}日連続でタスクを完了しています` : "今日タスクを完了して連続記録を始めよう"}
    >
      <span className={cn("text-sm", isActive ? "opacity-100" : "opacity-40")}>🔥</span>
      {isActive ? (
        <span>
          <span className="font-bold text-sm">{days}</span>
          <span className="text-muted-foreground ml-0.5">日連続</span>
        </span>
      ) : (
        <span>連続記録を始めよう</span>
      )}
    </motion.div>
  );
}
