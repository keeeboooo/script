"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCompass } from "@/hooks/useCompass";
import { useTasks } from "@/hooks/useTasks";
import { PhilosophyChat } from "@/components/features/compass/PhilosophyChat";
import { PhilosophyCard } from "@/components/features/compass/PhilosophyCard";
import { GoalInput } from "@/components/features/compass/GoalInput";
import { RoadmapTimeline } from "@/components/features/compass/RoadmapTimeline";
import { RoadmapList } from "@/components/features/compass/RoadmapList";
import type { Milestone, Roadmap } from "@/hooks/useCompass";
import { springTransition } from "@/lib/motion";

export default function CompassPage() {
  const {
    messages,
    sendMessage,
    isChatLoading,
    resetChat,
    philosophy,
    generatePhilosophy,
    isPhilosophyLoading,
    roadmaps,
    generateRoadmap,
    isRoadmapLoading,
    markMilestoneImported,
    deleteRoadmap,
    updateRoadmap,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    editRoadmapWithAI,
  } = useCompass();

  const { importFromRoadmap } = useTasks();

  // 選択中のロードマップID（null = 一覧表示）
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const selectedRoadmap = roadmaps.find((r) => r.id === selectedRoadmapId) ?? null;

  const handleGenerateRoadmap = useCallback(
    async (goal: string, timeframe: string) => {
      const newId = await generateRoadmap(goal, timeframe);
      if (newId) setSelectedRoadmapId(newId);
    },
    [generateRoadmap]
  );

  const handleImportMilestone = useCallback(
    (roadmap: Roadmap, milestone: Milestone) => {
      importFromRoadmap(milestone, roadmap.id, roadmap.title ?? roadmap.goal);
      markMilestoneImported(roadmap.id, milestone.id);
    },
    [importFromRoadmap, markMilestoneImported]
  );

  const handleDeleteRoadmap = useCallback(
    (roadmapId: string) => {
      deleteRoadmap(roadmapId);
      if (selectedRoadmapId === roadmapId) setSelectedRoadmapId(null);
    },
    [deleteRoadmap, selectedRoadmapId]
  );

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto space-y-8 pt-4">
      {/* Hero */}
      <motion.div
        className="text-center space-y-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
      >
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-compass via-compass-muted to-compass/50">
          Compass
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          立ち止まって考え、方向性を定める。あなたの価値観と人生のロードマップを描きます。
        </p>
      </motion.div>

      {/* Section 1: Value Extraction (対話 + Philosophy) */}
      <motion.section
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="glass-compass rounded-2xl p-6">
          <PhilosophyChat
            messages={messages}
            onSendMessage={sendMessage}
            onGeneratePhilosophy={generatePhilosophy}
            onResetChat={resetChat}
            isChatLoading={isChatLoading}
            isPhilosophyLoading={isPhilosophyLoading}
          />
        </div>

        {philosophy && <PhilosophyCard philosophy={philosophy} />}
      </motion.section>

      {/* Section 2: Life Reverse-Engineering (ロードマップ) */}
      <motion.section
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-center space-y-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Roadmap
          </h2>
          <p className="text-sm text-muted-foreground">
            最終ゴールから逆算して、今やるべきことを明確にします。
          </p>
        </div>

        <GoalInput onSubmit={handleGenerateRoadmap} isLoading={isRoadmapLoading} />

        {isRoadmapLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4 w-full"
          >
            <motion.div
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4 text-compass" />
              AIがロードマップを生成中...
            </motion.div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-32 w-full glass-compass rounded-2xl animate-pulse bg-compass-subtle/20"
              />
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isRoadmapLoading && selectedRoadmap ? (
            // 詳細ビュー
            <motion.div
              key={`detail-${selectedRoadmap.id}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={springTransition}
              className="space-y-4"
            >
              <button
                onClick={() => setSelectedRoadmapId(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="ロードマップ一覧に戻る"
              >
                ← 一覧に戻る
              </button>
              <RoadmapTimeline
                roadmap={selectedRoadmap}
                onImportMilestone={(milestone) =>
                  handleImportMilestone(selectedRoadmap, milestone)
                }
                onUpdateRoadmap={(patch) => updateRoadmap(selectedRoadmap.id, patch)}
                onAddMilestone={(m) => addMilestone(selectedRoadmap.id, m)}
                onUpdateMilestone={(milestoneId, patch) =>
                  updateMilestone(selectedRoadmap.id, milestoneId, patch)
                }
                onDeleteMilestone={(milestoneId) =>
                  deleteMilestone(selectedRoadmap.id, milestoneId)
                }
                onEditRoadmapWithAI={(roadmapId, instruction) =>
                  editRoadmapWithAI(roadmapId, instruction)
                }
              />
            </motion.div>
          ) : !isRoadmapLoading && roadmaps.length > 0 ? (
            // 一覧ビュー
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={springTransition}
            >
              <RoadmapList
                roadmaps={roadmaps}
                onSelect={setSelectedRoadmapId}
                onDelete={handleDeleteRoadmap}
                onUpdateTitle={(id, title) => updateRoadmap(id, { title })}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
