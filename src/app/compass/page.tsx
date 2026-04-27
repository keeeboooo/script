"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { useCompass } from "@/hooks/useCompass";
import { useTasks } from "@/hooks/useTasks";
import { PhilosophyChat } from "@/components/features/compass/PhilosophyChat";
import { PhilosophyCard } from "@/components/features/compass/PhilosophyCard";
import { PhilosophyList } from "@/components/features/compass/PhilosophyList";
import { GoalInput } from "@/components/features/compass/GoalInput";
import { RoadmapTimeline } from "@/components/features/compass/RoadmapTimeline";
import { RoadmapList } from "@/components/features/compass/RoadmapList";
import type { Milestone, Roadmap } from "@/hooks/useCompass";
import { springTransition } from "@/lib/motion";

export default function CompassPage() {
  const {
    // Philosophy list
    philosophies,
    setActivePhilosophy,
    deletePhilosophy,
    // Philosophy session
    editingPhilosophyId,
    startNewPhilosophySession,
    openPhilosophySession,
    closePhilosophySession,
    // Philosophy generation
    generatePhilosophy,
    isPhilosophyLoading,
    // Chat
    messages,
    sendMessage,
    isChatLoading,
    resetChat,
    // Roadmap
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

  // 哲学セクションの表示状態
  const isInSession = editingPhilosophyId !== null;

  // 編集中の哲学オブジェクト（新規の場合はnull）
  const editingPhilosophy =
    editingPhilosophyId !== null && editingPhilosophyId !== "new"
      ? (philosophies.find((p) => p.id === editingPhilosophyId) ?? null)
      : null;

  // ロードマップ
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const selectedRoadmap = roadmaps.find((r) => r.id === selectedRoadmapId) ?? null;

  const goalInputRef = useRef<HTMLDivElement>(null);

  const handleCreateRoadmapFromPhilosophy = useCallback(() => {
    goalInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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

  const activePhilosophy = philosophies.find((p) => p.isActive) ?? null;

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

      {/* Section 1: Philosophy */}
      <motion.section
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <AnimatePresence mode="wait">
          {isInSession ? (
            // ─── セッションビュー ───────────────────────────────────────────
            <motion.div
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <button
                onClick={closePhilosophySession}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="哲学一覧に戻る"
              >
                ← 一覧に戻る
              </button>

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

              {editingPhilosophy && (
                <PhilosophyCard
                  philosophy={editingPhilosophy}
                  onCreateRoadmap={handleCreateRoadmapFromPhilosophy}
                  onSetActive={
                    !editingPhilosophy.isActive
                      ? () => setActivePhilosophy(editingPhilosophy.id)
                      : undefined
                  }
                  onDelete={() => deletePhilosophy(editingPhilosophy.id)}
                />
              )}
            </motion.div>
          ) : (
            // ─── 一覧ビュー ─────────────────────────────────────────────────
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="font-display text-lg font-bold tracking-tight">My Philosophy</h2>
                  <p className="text-xs text-muted-foreground">
                    対話から生まれた、あなた自身の哲学
                  </p>
                </div>
                <motion.button
                  onClick={startNewPhilosophySession}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springTransition}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-compass border border-compass-border/50 text-compass text-sm font-medium hover:glass-compass-hover transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新しい哲学
                </motion.button>
              </div>

              {philosophies.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-compass rounded-2xl p-10 text-center space-y-3"
                >
                  <p className="text-muted-foreground text-sm">
                    まだ哲学がありません
                  </p>
                  <motion.button
                    onClick={startNewPhilosophySession}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springTransition}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-compass-subtle text-compass text-sm font-medium border border-compass-border/50 hover:bg-compass/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    はじめての哲学を作る
                  </motion.button>
                </motion.div>
              ) : (
                <PhilosophyList
                  philosophies={philosophies}
                  onOpen={openPhilosophySession}
                  onDelete={deletePhilosophy}
                  onSetActive={setActivePhilosophy}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Section 2: Roadmap */}
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
            叶えたいことから逆算して、今やるべきことを明確にします。
          </p>
        </div>

        {/* Active philosophy banner */}
        <AnimatePresence>
          {activePhilosophy && (
            <motion.div
              key="philosophy-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springTransition}
              className="glass-compass rounded-xl px-4 py-3 border border-compass-border/40 flex items-start gap-3"
            >
              <span className="text-compass mt-0.5 shrink-0 text-sm">✦</span>
              <p
                className="text-sm text-compass/80 italic leading-relaxed line-clamp-2"
                title={activePhilosophy.lifeStatement}
              >
                &ldquo;{activePhilosophy.lifeStatement}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <GoalInput
          ref={goalInputRef}
          onSubmit={handleGenerateRoadmap}
          isLoading={isRoadmapLoading}
        />

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
            <motion.div
              key={`detail-${selectedRoadmap.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
