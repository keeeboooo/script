"use client";

import { motion } from "framer-motion";
import { BookOpen, Trash2, ChevronRight, Star } from "lucide-react";
import { springTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PhilosophyWithMeta } from "@/hooks/useCompass";

interface PhilosophyListProps {
  philosophies: PhilosophyWithMeta[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springTransition },
};

function formatCreatedAt(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PhilosophyList({
  philosophies,
  onOpen,
  onDelete,
  onSetActive,
}: PhilosophyListProps) {
  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {philosophies.map((philosophy) => (
        <motion.li key={philosophy.id} variants={itemVariants}>
          <div className="group flex items-center gap-3 glass-compass rounded-2xl p-4 hover:glass-compass-hover transition-colors">
            {/* Icon + active indicator */}
            <div
              className={cn(
                "p-2 rounded-xl flex-shrink-0",
                philosophy.isActive ? "bg-compass-subtle" : "bg-secondary"
              )}
            >
              <BookOpen
                className={cn(
                  "w-4 h-4",
                  philosophy.isActive ? "text-compass" : "text-muted-foreground"
                )}
              />
            </div>

            {/* Main content */}
            <motion.button
              onClick={() => onOpen(philosophy.id)}
              className="flex-1 min-w-0 text-left"
              aria-label={`「${philosophy.title}」を開く`}
            >
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{philosophy.title}</p>
                {philosophy.isActive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-compass-subtle text-compass border border-compass-border/50 flex-shrink-0">
                    <Star className="w-2.5 h-2.5" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate max-w-[200px] italic">
                  &ldquo;{philosophy.lifeStatement}&rdquo;
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {philosophy.values.slice(0, 3).map((v) => (
                  <span
                    key={v.name}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground border border-foreground/10"
                  >
                    {v.name}
                  </span>
                ))}
                {philosophy.values.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{philosophy.values.length - 3}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatCreatedAt(philosophy.createdAt)}
                </span>
              </div>
            </motion.button>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!philosophy.isActive && (
                <motion.button
                  onClick={() => onSetActive(philosophy.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springTransition}
                  aria-label={`「${philosophy.title}」をアクティブにする`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-compass hover:bg-compass-subtle/50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Star className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                onClick={() => onDelete(philosophy.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={springTransition}
                aria-label={`「${philosophy.title}」を削除`}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
