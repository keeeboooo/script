"use client";

import { motion } from "framer-motion";
import { springTransition } from "@/lib/motion";
import type { RewardType } from "@/lib/rewards";

interface CompletionRewardProps {
  type: RewardType;
  linkedGoalName?: string;
  streakDays?: number;
  onComplete: () => void;
}

const INK_COLOR = "#2C2C28";

function SubtleReward({ onComplete }: { onComplete: () => void }) {
  const count = Math.floor(Math.random() * 3) + 3; // 3–5 dots
  const dots = Array.from({ length: count });

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-visible"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.2, delay: 0.4 }}
      onAnimationComplete={onComplete}
    >
      {dots.map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * 18;
        const y = Math.sin(rad) * 18;
        return (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: INK_COLOR, opacity: 0.5 }}
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={{ x, y, scale: 0 }}
            transition={{ ...springTransition, duration: 0.6, delay: i * 0.04 }}
          />
        );
      })}
    </motion.div>
  );
}

function BurstReward({ onComplete }: { onComplete: () => void }) {
  const count = 8;
  const dots = Array.from({ length: count });

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-visible"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, delay: 0.5 }}
      onAnimationComplete={onComplete}
    >
      {dots.map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const dist = 24 + Math.random() * 8;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        const size = 6 + Math.floor(Math.random() * 4);
        return (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{ backgroundColor: INK_COLOR, opacity: 0.7, width: size, height: size }}
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={{ x, y, scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: i * 0.03 }}
          />
        );
      })}
    </motion.div>
  );
}

function StreakBoostReward({ streakDays, onComplete }: { streakDays: number; onComplete: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="flex flex-col items-center gap-0.5"
        initial={{ scale: 0.5, opacity: 0, y: 4 }}
        animate={{ scale: [0.5, 1.8, 1.4, 1], opacity: [0, 1, 1, 0], y: [4, -8, -12, -20] }}
        transition={{ duration: 1.6, times: [0, 0.3, 0.6, 1] }}
      >
        <span className="text-2xl leading-none select-none">🔥</span>
        <span className="text-xs font-bold text-foreground/80 tabular-nums">{streakDays}日</span>
      </motion.div>
    </motion.div>
  );
}

function QuoteReward({ linkedGoalName, onComplete }: { linkedGoalName: string; onComplete: () => void }) {
  return (
    <motion.div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ bottom: "calc(100% + 4px)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={springTransition}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="glass px-3 py-2 rounded-xl border border-compass-border text-xs text-compass flex items-center gap-2 shadow-sm"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, delay: 2 }}
      >
        <span className="text-compass/80 flex-shrink-0">🧭</span>
        <span className="truncate">{linkedGoalName}</span>
      </motion.div>
    </motion.div>
  );
}

export function CompletionReward({ type, linkedGoalName = "", streakDays = 0, onComplete }: CompletionRewardProps) {
  if (type === 'streak_boost') {
    return <StreakBoostReward streakDays={streakDays} onComplete={onComplete} />;
  }
  if (type === 'burst') {
    return <BurstReward onComplete={onComplete} />;
  }
  if (type === 'quote' && linkedGoalName) {
    return <QuoteReward linkedGoalName={linkedGoalName} onComplete={onComplete} />;
  }
  return <SubtleReward onComplete={onComplete} />;
}
