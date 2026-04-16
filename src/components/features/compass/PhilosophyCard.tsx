"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Heart, ArrowRight, ChevronDown, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhilosophyWithMeta } from "@/hooks/useCompass";
import { springTransition } from "@/lib/motion";

interface PhilosophyCardProps {
  philosophy: PhilosophyWithMeta;
  onCreateRoadmap?: () => void;
  onSetActive?: () => void;
  onDelete?: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: springTransition },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export function PhilosophyCard({
  philosophy,
  onCreateRoadmap,
  onSetActive,
  onDelete,
}: PhilosophyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className="glass-compass rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-secondary">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate flex-1 min-w-0">{philosophy.title}</h2>
            {philosophy.isActive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-compass-subtle text-compass border border-compass-border/50 flex-shrink-0">
                <Star className="w-2.5 h-2.5" />
                Active
              </span>
            )}
          </div>
        </div>
        {onDelete && (
          <motion.button
            onClick={onDelete}
            whileTap={{ scale: 0.9 }}
            transition={springTransition}
            aria-label="この哲学を削除"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Life Statement — always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center py-4 px-6 rounded-xl bg-compass-subtle/50 border border-compass-border/50"
      >
        <p className="text-compass text-sm font-medium italic leading-relaxed">
          &ldquo;{philosophy.lifeStatement}&rdquo;
        </p>
      </motion.div>

      {/* Value tags — always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {philosophy.values.map((value) => (
          <span
            key={value.name}
            className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-foreground/10"
          >
            {value.name}
          </span>
        ))}
      </motion.div>

      {/* Toggle detail */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-compass/60 hover:text-compass transition-colors"
        aria-expanded={isExpanded}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={springTransition}
          className="inline-flex"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
        {isExpanded ? "詳細を閉じる" : "詳細を見る"}
      </button>

      {/* Expandable details */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ ...springTransition, duration: 0.3 }}
            className="overflow-hidden space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="w-4 h-4 text-compass" />
              大切にしている価値観
            </div>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
              {philosophy.values.map((value) => (
                <motion.div
                  key={value.name}
                  variants={itemVariants}
                  className="glass rounded-xl p-4 space-y-1"
                >
                  <h4 className="font-semibold text-sm">{value.name}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  <p className="text-xs text-compass/60 italic">{value.origin}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.25 }}
        className={cn("pt-2 border-t border-compass-border/30 flex flex-col gap-2", isExpanded && "mt-2")}
      >
        {onSetActive && !philosophy.isActive && (
          <motion.button
            onClick={onSetActive}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-compass-border/50 text-compass/70 text-sm hover:bg-compass-subtle/50 transition-colors"
          >
            <Star className="w-4 h-4" />
            この哲学をアクティブにする
          </motion.button>
        )}
        {onCreateRoadmap && (
          <motion.button
            onClick={onCreateRoadmap}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl glass-compass border border-compass-border/50 text-compass text-sm font-medium hover:glass-compass-hover transition-colors"
          >
            この哲学をもとにロードマップを作る
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
