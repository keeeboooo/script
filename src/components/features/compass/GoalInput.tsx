"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";

interface GoalInputProps {
  onSubmit: (goal: string, timeframe: string) => void;
  isLoading?: boolean;
}

const timeframes = [
  { value: "3ヶ月", label: "3ヶ月" },
  { value: "6ヶ月", label: "6ヶ月" },
  { value: "1年", label: "1年" },
  { value: "3年", label: "3年" },
  { value: "5年", label: "5年" },
  { value: "10年", label: "10年" },
] as const;

export function GoalInput({ onSubmit, isLoading }: GoalInputProps) {
  const [goal, setGoal] = useState("");
  const [timeframe, setTimeframe] = useState("1年");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) return;
    onSubmit(goal, timeframe);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: 0.1 }}
    >
      {/* Goal text input */}
      <div className="flex items-center glass-compass rounded-2xl p-2 focus-within:glass-compass-hover transition-colors">
        <div className="pl-3 pr-2 flex items-center justify-center text-compass/60">
          <Target className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="最終ゴールを入力 例: 「30歳までに独立してフリーランスエンジニアになる」"
          aria-label="最終ゴール"
          aria-busy={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-3 text-base"
          disabled={isLoading}
        />
      </div>

      {/* Timeframe selector + submit */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">達成期間:</span>
          <div className="flex gap-1 p-1 rounded-xl glass">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value)}
                aria-pressed={timeframe === tf.value}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative",
                  timeframe === tf.value
                    ? "text-compass"
                    : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {timeframe === tf.value && (
                  <motion.div
                    layoutId="timeframe-indicator"
                    className="absolute inset-0 rounded-lg bg-compass-subtle border border-compass-border"
                    transition={springTransition}
                  />
                )}
                <span className="relative z-10">{tf.label}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!goal.trim() || isLoading}
          aria-label="ゴールを設定してロードマップを生成"
          whileHover={!goal.trim() || isLoading ? {} : { y: -2, scale: 1.05 }}
          whileTap={!goal.trim() || isLoading ? {} : { scale: 0.95 }}
          transition={springTransition}
          className={cn(
            "p-3 rounded-xl flex items-center justify-center transition-colors",
            goal.trim() && !isLoading
              ? "bg-compass text-white hover:bg-compass-muted"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.form>
  );
}
