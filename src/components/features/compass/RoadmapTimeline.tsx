"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ArrowRight, Check, Pencil, Trash2, Plus, X, Wand2, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";
import { toast } from "sonner";
import { ApiError, getUserFriendlyErrorMessage, getNetworkErrorMessage } from "@/lib/errors";
import type { Milestone, Roadmap } from "@/hooks/useCompass";

interface RoadmapTimelineProps {
  roadmap: Roadmap;
  onImportMilestone: (milestone: Milestone) => void;
  onUpdateRoadmap: (patch: Partial<Pick<Roadmap, "title" | "goal" | "timeframe">>) => void;
  onAddMilestone: (milestone: Omit<Milestone, "id">) => void;
  onUpdateMilestone: (milestoneId: string, patch: Partial<Pick<Milestone, "period" | "title" | "description" | "keyActions">>) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onEditRoadmapWithAI?: (roadmapId: string, instruction: string) => Promise<void>;
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: springTransition },
};

// ── インライン編集用テキストフィールド ───────────────────────────────────────
interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
}

function InlineEdit({ value, onSave, className, inputClassName, multiline, placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className={cn("w-full bg-background/60 border border-compass/30 rounded-lg px-2 py-1 text-sm outline-none resize-none", inputClassName)}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("w-full bg-background/60 border border-compass/30 rounded-lg px-2 py-1 text-sm outline-none", inputClassName)}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("text-left hover:opacity-70 transition-opacity group/edit flex items-center gap-1", className)}
      aria-label={`編集: ${value}`}
    >
      <span>{value}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover/edit:opacity-40 transition-opacity flex-shrink-0" />
    </button>
  );
}

// ── マイルストーン追加フォーム ────────────────────────────────────────────────
interface AddMilestoneFormProps {
  onAdd: (milestone: Omit<Milestone, "id">) => void;
  onCancel: () => void;
}

function AddMilestoneForm({ onAdd, onCancel }: AddMilestoneFormProps) {
  const [period, setPeriod] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyActionsRaw, setKeyActionsRaw] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!period.trim() || !title.trim()) return;
    onAdd({
      period: period.trim(),
      title: title.trim(),
      description: description.trim(),
      keyActions: keyActionsRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      isImported: false,
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={springTransition}
      className="glass-compass rounded-2xl p-4 space-y-3"
    >
      <p className="text-xs font-medium text-compass/70 uppercase tracking-wider">新しいマイルストーン</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          autoFocus
          type="text"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="期間（例: 3ヶ月後）"
          className="bg-background/60 border border-compass/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="bg-background/60 border border-compass/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="説明"
        rows={2}
        className="w-full bg-background/60 border border-compass/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
      />
      <textarea
        value={keyActionsRaw}
        onChange={(e) => setKeyActionsRaw(e.target.value)}
        placeholder={"Key Actions（1行1アクション）"}
        rows={3}
        className="w-full bg-background/60 border border-compass/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!period.trim() || !title.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-compass text-compass-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>
    </motion.form>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────────────
export function RoadmapTimeline({
  roadmap,
  onImportMilestone,
  onUpdateRoadmap,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onEditRoadmapWithAI,
}: RoadmapTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAIEditOpen, setIsAIEditOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAIEditing, setIsAIEditing] = useState(false);

  const handleAIEditSubmit = async () => {
    if (!aiInstruction.trim() || !onEditRoadmapWithAI || isAIEditing) return;
    setIsAIEditing(true);
    try {
      await onEditRoadmapWithAI(roadmap.id, aiInstruction.trim());
      setIsAIEditOpen(false);
      setAiInstruction("");
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        toast.error(getUserFriendlyErrorMessage(error.status, error.errorCode));
      } else {
        toast.error(getNetworkErrorMessage());
      }
    } finally {
      setIsAIEditing(false);
    }
  };

  const handleAIEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleAIEditSubmit();
    }
    if (e.key === "Escape") {
      setIsAIEditOpen(false);
      setAiInstruction("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-compass-subtle">
          <MapPin className="w-5 h-5 text-compass" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          {roadmap.title !== undefined ? (
            <InlineEdit
              value={roadmap.title}
              onSave={(v) => onUpdateRoadmap({ title: v })}
              className="text-lg font-bold tracking-tight"
            />
          ) : null}
          <InlineEdit
            value={roadmap.goal}
            onSave={(v) => onUpdateRoadmap({ goal: v })}
            className={cn(roadmap.title ? "text-sm text-muted-foreground" : "text-lg font-bold tracking-tight")}
          />
          <InlineEdit
            value={roadmap.timeframe}
            onSave={(v) => onUpdateRoadmap({ timeframe: v })}
            className="text-sm text-muted-foreground"
            inputClassName="text-sm"
          />
        </div>
        {onEditRoadmapWithAI && (
          <motion.button
            onClick={() => setIsAIEditOpen((prev) => !prev)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isAIEditOpen
                ? "bg-compass/20 text-compass"
                : "text-muted-foreground hover:text-compass hover:bg-compass-subtle border border-compass-border/40"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springTransition}
            aria-label="AIでロードマップを修正"
            aria-pressed={isAIEditOpen}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AIで修正</span>
          </motion.button>
        )}
      </div>

      {/* AI Edit Panel */}
      <AnimatePresence>
        {isAIEditOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={springTransition}
            className="overflow-hidden"
          >
            <div className="glass-compass rounded-xl p-3 flex gap-2 items-start">
              <Wand2 className="w-3.5 h-3.5 text-compass flex-shrink-0 mt-1.5" />
              <textarea
                autoFocus
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={handleAIEditKeyDown}
                disabled={isAIEditing}
                placeholder="修正指示を入力（例：フェーズ3にモバイルアプリ対応を追加して）"
                rows={2}
                className="flex-1 bg-transparent outline-none text-sm resize-none disabled:opacity-50 placeholder:text-muted-foreground/50"
              />
              <motion.button
                onClick={() => void handleAIEditSubmit()}
                disabled={!aiInstruction.trim() || isAIEditing}
                className="flex-shrink-0 p-1.5 rounded-lg text-compass hover:bg-compass/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
                whileTap={{ scale: 0.9 }}
                transition={springTransition}
                aria-label="修正を送信"
              >
                {isAIEditing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="relative"
      >
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-compass/40 via-compass/20 to-transparent" />

        <AnimatePresence>
          {roadmap.milestones.map((milestone, index) => {
            const isLast = index === roadmap.milestones.length - 1;

            return (
              <motion.div
                key={milestone.id}
                variants={itemVariants}
                className="relative flex gap-4 pb-8 last:pb-0 group/milestone"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isLast
                      ? "bg-compass/20 border-compass text-compass"
                      : "bg-background border-compass/30 text-compass/60"
                  )}
                >
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 glass-compass rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <InlineEdit
                        value={milestone.period}
                        onSave={(v) => onUpdateMilestone(milestone.id, { period: v })}
                        className="text-xs font-medium text-compass/70 uppercase tracking-wider whitespace-nowrap"
                        inputClassName="text-xs uppercase"
                      />
                      <InlineEdit
                        value={milestone.title}
                        onSave={(v) => onUpdateMilestone(milestone.id, { title: v })}
                        className="text-base font-semibold tracking-tight"
                      />
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Import to Engine button */}
                      <motion.button
                        onClick={() => onImportMilestone(milestone)}
                        disabled={milestone.isImported}
                        aria-disabled={milestone.isImported}
                        aria-label={milestone.isImported ? `「${milestone.title}」はインポート済み` : `「${milestone.title}」をEngineにインポート`}
                        whileHover={milestone.isImported ? {} : { scale: 1.05 }}
                        whileTap={milestone.isImported ? {} : { scale: 0.95 }}
                        transition={springTransition}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          milestone.isImported
                            ? "bg-secondary/30 text-muted-foreground cursor-default"
                            : "bg-secondary/30 text-foreground hover:bg-secondary/60 border border-border/40"
                        )}
                      >
                        {milestone.isImported ? (
                          <><Check className="w-3 h-3" />済</>
                        ) : (
                          <><ArrowRight className="w-3 h-3" />Engine</>
                        )}
                      </motion.button>

                      {/* Delete milestone */}
                      <motion.button
                        onClick={() => onDeleteMilestone(milestone.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        transition={springTransition}
                        aria-label={`「${milestone.title}」を削除`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/milestone:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  <InlineEdit
                    value={milestone.description}
                    onSave={(v) => onUpdateMilestone(milestone.id, { description: v })}
                    className="text-sm text-muted-foreground leading-relaxed"
                    multiline
                  />

                  {milestone.keyActions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-compass/50">Key Actions</span>
                      <ul className="space-y-1">
                        {milestone.keyActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start gap-2 text-xs text-foreground/70 group/action">
                            <span className="text-compass/40 mt-0.5">•</span>
                            <InlineEdit
                              value={action}
                              onSave={(v) => {
                                const updated = [...milestone.keyActions];
                                updated[actionIndex] = v;
                                onUpdateMilestone(milestone.id, { keyActions: updated });
                              }}
                              className="flex-1"
                            />
                            <button
                              onClick={() => {
                                const updated = milestone.keyActions.filter((_, i) => i !== actionIndex);
                                onUpdateMilestone(milestone.id, { keyActions: updated });
                              }}
                              aria-label="このアクションを削除"
                              className="opacity-0 group-hover/action:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Add milestone */}
      <div className="pl-14">
        <AnimatePresence mode="wait">
          {showAddForm ? (
            <AddMilestoneForm
              key="form"
              onAdd={(m) => { onAddMilestone(m); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <motion.button
              key="btn"
              onClick={() => setShowAddForm(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springTransition}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-compass transition-colors"
              aria-label="マイルストーンを追加"
            >
              <Plus className="w-4 h-4" />
              マイルストーンを追加
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
