"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PhilosophySchema,
  PhilosophyWithMetaSchema,
  RoadmapResponseSchema,
  ChatResponseSchema,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface PhilosophyValue {
  name: string;
  description: string;
  origin: string;
}

export interface Philosophy {
  title: string;
  values: PhilosophyValue[];
  beliefs: string[];
  actionPrinciples: string[];
  lifeStatement: string;
}

export interface PhilosophyWithMeta extends Philosophy {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  period: string;
  title: string;
  description: string;
  keyActions: string[];
  isImported?: boolean;
}

export interface Roadmap {
  id: string;
  createdAt: string;
  title?: string;
  goal: string;
  timeframe: string;
  milestones: Milestone[];
}

// 新規セッションを示すセンチネル値
const NEW_SESSION = "new" as const;
type EditingPhilosophyId = string | typeof NEW_SESSION | null;

// ─── DB row 変換ヘルパー ────────────────────────────────────────────────────

function rowToMilestone(row: {
  id: string;
  period: string;
  title: string;
  description: string;
  key_actions: string[];
  is_imported: boolean;
  position: number;
}): Milestone {
  return {
    id: row.id,
    period: row.period,
    title: row.title,
    description: row.description,
    keyActions: row.key_actions,
    isImported: row.is_imported,
  };
}

function rowToRoadmap(
  row: {
    id: string;
    created_at: string;
    title: string | null;
    goal: string;
    timeframe: string;
  },
  milestones: Milestone[]
): Roadmap {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title ?? undefined,
    goal: row.goal,
    timeframe: row.timeframe,
    milestones,
  };
}

function rowToPhilosophyWithMeta(
  row: {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    life_statement: string;
    beliefs: string[];
    action_principles: string[];
    is_active: boolean;
    philosophy_values: { name: string; description: string; origin: string; position: number }[];
  }
): PhilosophyWithMeta | null {
  const parsed = PhilosophyWithMetaSchema.safeParse({
    id: row.id,
    title: row.title,
    lifeStatement: row.life_statement,
    beliefs: row.beliefs,
    actionPrinciples: row.action_principles,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    values: row.philosophy_values
      .sort((a, b) => a.position - b.position)
      .map(({ name, description, origin }) => ({ name, description, origin })),
  });
  return parsed.success ? parsed.data : null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCompass() {
  const supabase = useRef(createClient()).current;

  // Philosophy
  const [philosophies, setPhilosophies] = useState<PhilosophyWithMeta[]>([]);
  const [editingPhilosophyId, setEditingPhilosophyId] = useState<EditingPhilosophyId>(null);
  const [isPhilosophyLoading, setIsPhilosophyLoading] = useState(false);

  // Chat (スコープ: editingPhilosophyId のセッション)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // 新規セッション中に philosophy_id なしで送ったメッセージをバッファ
  const pendingMessagesRef = useRef<ChatMessage[]>([]);

  // Roadmap
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  // ─── 初期データ取得 ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [philResult, roadmapResult] = await Promise.all([
        supabase
          .from("philosophies")
          .select("*, philosophy_values(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("roadmaps")
          .select("*, milestones(*)")
          .order("created_at", { ascending: false }),
      ]);

      const { data: philRows } = philResult;
      const { data: roadmapRows } = roadmapResult;

      if (philRows) {
        const mapped = philRows
          .map((r) =>
            rowToPhilosophyWithMeta(
              r as Parameters<typeof rowToPhilosophyWithMeta>[0]
            )
          )
          .filter((p): p is PhilosophyWithMeta => p !== null);
        setPhilosophies(mapped);
      }

      if (roadmapRows) {
        const mapped: Roadmap[] = roadmapRows.map((r) => {
          const milestones = (r.milestones as Parameters<typeof rowToMilestone>[0][])
            .sort((a, b) => a.position - b.position)
            .map(rowToMilestone);
          return rowToRoadmap(r, milestones);
        });
        setRoadmaps(mapped);
      }
    };

    fetchAll();
  }, [supabase]);

  // ─── Philosophy セッション管理 ─────────────────────────────────────────────

  const startNewPhilosophySession = useCallback(() => {
    setEditingPhilosophyId(NEW_SESSION);
    messagesRef.current = [];
    pendingMessagesRef.current = [];
    setMessages([]);
  }, []);

  const openPhilosophySession = useCallback(
    async (philosophyId: string) => {
      setEditingPhilosophyId(philosophyId);
      messagesRef.current = [];
      pendingMessagesRef.current = [];
      setMessages([]);

      const { data: msgRows } = await supabase
        .from("compass_messages")
        .select("*")
        .eq("philosophy_id", philosophyId)
        .order("created_at", { ascending: true });

      if (msgRows) {
        const msgs: ChatMessage[] = msgRows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content,
        }));
        messagesRef.current = msgs;
        setMessages(msgs);
      }
    },
    [supabase]
  );

  const closePhilosophySession = useCallback(() => {
    setEditingPhilosophyId(null);
    messagesRef.current = [];
    pendingMessagesRef.current = [];
    setMessages([]);
  }, []);

  // ─── Chat ─────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const updated = [...messagesRef.current, userMessage];
      messagesRef.current = updated;
      setMessages(updated);

      if (editingPhilosophyId === NEW_SESSION) {
        // 新規セッション: philosophy_id が決まるまでバッファに積む
        pendingMessagesRef.current = [...pendingMessagesRef.current, userMessage];
      } else if (editingPhilosophyId !== null) {
        await supabase.from("compass_messages").insert({
          id: userMessage.id,
          user_id: user.id,
          philosophy_id: editingPhilosophyId,
          role: "user",
          content,
        });
      }

      setIsChatLoading(true);
      try {
        const response = await fetch("/api/compass/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!response.ok) throw new Error(`Chat API error: ${response.status}`);

        const parsed = ChatResponseSchema.safeParse(await response.json());
        if (parsed.success) {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: parsed.data.message,
          };
          const withAssistant = [...messagesRef.current, assistantMessage];
          messagesRef.current = withAssistant;
          setMessages(withAssistant);

          if (editingPhilosophyId === NEW_SESSION) {
            pendingMessagesRef.current = [...pendingMessagesRef.current, assistantMessage];
          } else if (editingPhilosophyId !== null) {
            await supabase.from("compass_messages").insert({
              id: assistantMessage.id,
              user_id: user.id,
              philosophy_id: editingPhilosophyId,
              role: "assistant",
              content: assistantMessage.content,
            });
          }
        }
      } catch (error) {
        console.error("Failed to send chat message:", error);
      } finally {
        setIsChatLoading(false);
      }
    },
    [supabase, editingPhilosophyId]
  );

  const resetChat = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    messagesRef.current = [];
    pendingMessagesRef.current = [];
    setMessages([]);

    if (editingPhilosophyId !== null && editingPhilosophyId !== NEW_SESSION) {
      await supabase
        .from("compass_messages")
        .delete()
        .eq("philosophy_id", editingPhilosophyId);
    }
  }, [supabase, editingPhilosophyId]);

  // ─── Philosophy 生成・更新 ────────────────────────────────────────────────

  const generatePhilosophy = useCallback(async () => {
    const currentMessages = messagesRef.current;
    if (currentMessages.length < 2) return;

    setIsPhilosophyLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch("/api/compass/philosophy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`Philosophy API error: ${response.status}`);

      const parsed = PhilosophySchema.safeParse(await response.json());
      if (!parsed.success) return;

      const p = parsed.data;

      if (editingPhilosophyId === NEW_SESSION) {
        // ─── 新規作成 ───────────────────────────────────────────────────────
        const { data: newPhil } = await supabase
          .from("philosophies")
          .insert({
            user_id: user.id,
            title: p.title,
            life_statement: p.lifeStatement,
            beliefs: p.beliefs,
            action_principles: p.actionPrinciples,
            is_active: false,
          })
          .select("id, created_at, updated_at")
          .single();

        if (!newPhil) throw new Error("Philosophy の保存に失敗しました");

        const philosophyId: string = newPhil.id;

        // バッファしていたメッセージを一括保存
        if (pendingMessagesRef.current.length > 0) {
          await supabase.from("compass_messages").insert(
            pendingMessagesRef.current.map((m) => ({
              id: m.id,
              user_id: user.id,
              philosophy_id: philosophyId,
              role: m.role,
              content: m.content,
            }))
          );
          pendingMessagesRef.current = [];
        }

        if (p.values.length > 0) {
          await supabase.from("philosophy_values").insert(
            p.values.map((v, i) => ({
              philosophy_id: philosophyId,
              name: v.name,
              description: v.description,
              origin: v.origin,
              position: i,
            }))
          );
        }

        const newPhilosophy: PhilosophyWithMeta = {
          ...p,
          id: philosophyId,
          isActive: false,
          createdAt: newPhil.created_at,
          updatedAt: newPhil.updated_at,
        };

        setPhilosophies((prev) => [newPhilosophy, ...prev]);
        setEditingPhilosophyId(philosophyId);
      } else if (editingPhilosophyId !== null) {
        // ─── 既存を更新 ─────────────────────────────────────────────────────
        const philosophyId = editingPhilosophyId;

        await supabase
          .from("philosophies")
          .update({
            title: p.title,
            life_statement: p.lifeStatement,
            beliefs: p.beliefs,
            action_principles: p.actionPrinciples,
          })
          .eq("id", philosophyId);

        await supabase
          .from("philosophy_values")
          .delete()
          .eq("philosophy_id", philosophyId);

        if (p.values.length > 0) {
          await supabase.from("philosophy_values").insert(
            p.values.map((v, i) => ({
              philosophy_id: philosophyId,
              name: v.name,
              description: v.description,
              origin: v.origin,
              position: i,
            }))
          );
        }

        setPhilosophies((prev) =>
          prev.map((existing) =>
            existing.id === philosophyId
              ? { ...existing, ...p, updatedAt: new Date().toISOString() }
              : existing
          )
        );
      }
    } catch (error) {
      console.error("Failed to generate philosophy:", error);
    } finally {
      setIsPhilosophyLoading(false);
    }
  }, [supabase, editingPhilosophyId]);

  // ─── Philosophy アクティブ切り替え ────────────────────────────────────────

  const setActivePhilosophy = useCallback(
    async (philosophyId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 現在アクティブなものを解除してから新しいものをアクティブに
      await supabase
        .from("philosophies")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      await supabase
        .from("philosophies")
        .update({ is_active: true })
        .eq("id", philosophyId);

      setPhilosophies((prev) =>
        prev.map((p) => ({ ...p, isActive: p.id === philosophyId }))
      );
    },
    [supabase]
  );

  // ─── Philosophy 削除 ─────────────────────────────────────────────────────

  const deletePhilosophy = useCallback(
    async (philosophyId: string) => {
      setPhilosophies((prev) => prev.filter((p) => p.id !== philosophyId));
      if (editingPhilosophyId === philosophyId) {
        closePhilosophySession();
      }
      await supabase.from("philosophies").delete().eq("id", philosophyId);
    },
    [supabase, editingPhilosophyId, closePhilosophySession]
  );

  // ─── Roadmap ─────────────────────────────────────────────────────────────

  const generateRoadmap = useCallback(
    async (goal: string, timeframe: string) => {
      setIsRoadmapLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const activePhilosophy = philosophies.find((p) => p.isActive);
        const philosophyPayload = activePhilosophy
          ? {
              lifeStatement: activePhilosophy.lifeStatement,
              values: activePhilosophy.values.map(({ name, description }) => ({
                name,
                description,
              })),
            }
          : undefined;

        const response = await fetch("/api/compass/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, timeframe, philosophy: philosophyPayload }),
        });

        if (!response.ok) throw new Error(`Roadmap API error: ${response.status}`);

        const parsed = RoadmapResponseSchema.safeParse(await response.json());
        if (!parsed.success) return null;

        const { data: roadmapRow } = await supabase
          .from("roadmaps")
          .insert({
            user_id: user.id,
            goal: parsed.data.goal ?? goal,
            timeframe: parsed.data.timeframe ?? timeframe,
          })
          .select("*")
          .single();

        if (!roadmapRow) return null;

        const { data: milestoneRows } = await supabase
          .from("milestones")
          .insert(
            parsed.data.milestones.map((m, i) => ({
              roadmap_id: roadmapRow.id,
              period: m.period,
              title: m.title,
              description: m.description,
              key_actions: m.keyActions,
              is_imported: false,
              position: i,
            }))
          )
          .select("*");

        const milestones = (milestoneRows ?? []).map(rowToMilestone);
        const newRoadmap = rowToRoadmap(roadmapRow, milestones);
        setRoadmaps((prev) => [newRoadmap, ...prev]);
        return newRoadmap.id;
      } catch (error) {
        console.error("Failed to generate roadmap:", error);
        return null;
      } finally {
        setIsRoadmapLoading(false);
      }
    },
    [supabase, philosophies]
  );

  const markMilestoneImported = useCallback(
    async (roadmapId: string, milestoneId: string) => {
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId
            ? {
                ...r,
                milestones: r.milestones.map((m) =>
                  m.id === milestoneId ? { ...m, isImported: true } : m
                ),
              }
            : r
        )
      );
      await supabase
        .from("milestones")
        .update({ is_imported: true })
        .eq("id", milestoneId);
    },
    [supabase]
  );

  const deleteRoadmap = useCallback(
    async (roadmapId: string) => {
      setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
      await supabase.from("roadmaps").delete().eq("id", roadmapId);
    },
    [supabase]
  );

  const updateRoadmap = useCallback(
    async (
      roadmapId: string,
      patch: Partial<Pick<Roadmap, "title" | "goal" | "timeframe">>
    ) => {
      setRoadmaps((prev) =>
        prev.map((r) => (r.id === roadmapId ? { ...r, ...patch } : r))
      );
      await supabase.from("roadmaps").update(patch).eq("id", roadmapId);
    },
    [supabase]
  );

  const addMilestone = useCallback(
    async (roadmapId: string, milestone: Omit<Milestone, "id">) => {
      const roadmap = roadmaps.find((r) => r.id === roadmapId);
      const position = roadmap ? roadmap.milestones.length : 0;

      const { data: row } = await supabase
        .from("milestones")
        .insert({
          roadmap_id: roadmapId,
          period: milestone.period,
          title: milestone.title,
          description: milestone.description,
          key_actions: milestone.keyActions,
          is_imported: milestone.isImported ?? false,
          position,
        })
        .select("*")
        .single();

      if (!row) return;

      const newMilestone = rowToMilestone(row);
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId
            ? { ...r, milestones: [...r.milestones, newMilestone] }
            : r
        )
      );
    },
    [roadmaps, supabase]
  );

  const updateMilestone = useCallback(
    async (
      roadmapId: string,
      milestoneId: string,
      patch: Partial<Pick<Milestone, "period" | "title" | "description" | "keyActions">>
    ) => {
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId
            ? {
                ...r,
                milestones: r.milestones.map((m) =>
                  m.id === milestoneId ? { ...m, ...patch } : m
                ),
              }
            : r
        )
      );

      const dbPatch: Record<string, string | string[]> = {};
      if (patch.period !== undefined) dbPatch.period = patch.period;
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      if (patch.keyActions !== undefined) dbPatch.key_actions = patch.keyActions;

      await supabase.from("milestones").update(dbPatch).eq("id", milestoneId);
    },
    [supabase]
  );

  const deleteMilestone = useCallback(
    async (roadmapId: string, milestoneId: string) => {
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId
            ? { ...r, milestones: r.milestones.filter((m) => m.id !== milestoneId) }
            : r
        )
      );
      await supabase.from("milestones").delete().eq("id", milestoneId);
    },
    [supabase]
  );

  return {
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
  };
}
