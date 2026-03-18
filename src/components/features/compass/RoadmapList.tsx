"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Trash2, ChevronRight, Pencil, Check } from "lucide-react";
import { springTransition } from "@/lib/motion";
import type { Roadmap } from "@/hooks/useCompass";

interface RoadmapListProps {
  roadmaps: Roadmap[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
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

export function RoadmapList({ roadmaps, onSelect, onDelete, onUpdateTitle }: RoadmapListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (roadmap: Roadmap) => {
    setEditingId(roadmap.id);
    setDraft(roadmap.title ?? roadmap.goal);
  };

  const saveEdit = (id: string) => {
    if (draft.trim()) onUpdateTitle(id, draft.trim());
    setEditingId(null);
  };

  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {roadmaps.map((roadmap) => {
        const importedCount = roadmap.milestones.filter((m) => m.isImported).length;
        const totalCount = roadmap.milestones.length;
        const isEditing = editingId === roadmap.id;
        const displayTitle = roadmap.title ?? roadmap.goal;

        return (
          <motion.li key={roadmap.id} variants={itemVariants}>
            <div className="group flex items-center gap-3 glass-compass rounded-2xl p-4 hover:glass-compass-hover transition-colors">
              {/* Icon */}
              <div className="p-2 rounded-xl bg-compass-subtle flex-shrink-0">
                <MapPin className="w-4 h-4 text-compass" />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => saveEdit(roadmap.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(roadmap.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 bg-background/60 border border-compass/30 rounded-lg px-2 py-0.5 text-sm font-semibold outline-none min-w-0"
                      />
                      <button
                        onMouseDown={(e) => { e.preventDefault(); saveEdit(roadmap.id); }}
                        aria-label="保存"
                        className="text-compass"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => onSelect(roadmap.id)}
                      className="w-full text-left"
                      aria-label={`「${displayTitle}」のロードマップを開く`}
                    >
                      <p className="font-semibold text-sm truncate">{displayTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{roadmap.timeframe}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCreatedAt(roadmap.createdAt)}
                        </span>
                        {importedCount > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-compass/70">
                              {importedCount}/{totalCount} インポート済み
                            </span>
                          </>
                        )}
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <motion.button
                  onClick={() => startEdit(roadmap)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springTransition}
                  aria-label={`「${displayTitle}」のタイトルを編集`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => onDelete(roadmap.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springTransition}
                  aria-label={`「${displayTitle}」を削除`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
