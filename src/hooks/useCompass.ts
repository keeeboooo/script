"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PhilosophySchema,
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

export interface Milestone {
  id: string;
  period: string;
  title: string;
  description: string;
  keyActions: string[];
  isImported?: boolean;
  // [The Thread - Phase 3設計メモ]
  // マイルストーンをEngineモードのタスクにインポートした際、
  // そのタスク群が「どのロードマップ・マイルストーン由来か」を追跡するため
  // linkedRoadmapId / linkedMilestoneId をTaskに持たせる構造はすでに実装済み。
  // 次フェーズでは逆方向（Task → Philosophy.values）の紐付けも実装予定。
}

export interface Roadmap {
  id: string;
  createdAt: string;
  title?: string;
  goal: string;
  timeframe: string;
  milestones: Milestone[];
}

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

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCompass() {
  const supabase = useRef(createClient()).current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [philosophy, setPhilosophy] = useState<Philosophy | null>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPhilosophyLoading, setIsPhilosophyLoading] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  // ─── 初期データ取得 ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [msgResult, philResult, roadmapResult] = await Promise.all([
        supabase
          .from("compass_messages")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("philosophies")
          .select("*, philosophy_values(*)")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("roadmaps")
          .select("*, milestones(*)")
          .order("created_at", { ascending: false }),
      ]);

      const { data: msgRows } = msgResult;
      const { data: philRow } = philResult;
      const { data: roadmapRows } = roadmapResult;

      if (msgRows) {
        const msgs: ChatMessage[] = msgRows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content,
        }));
        setMessages(msgs);
        messagesRef.current = msgs;
      }

      if (philRow) {
        const parsed = PhilosophySchema.safeParse({
          title: philRow.title,
          lifeStatement: philRow.life_statement,
          beliefs: philRow.beliefs,
          actionPrinciples: philRow.action_principles,
          values: (philRow.philosophy_values as { name: string; description: string; origin: string; position: number }[])
            .sort((a, b) => a.position - b.position)
            .map(({ name, description, origin }) => ({ name, description, origin })),
        });
        if (parsed.success) setPhilosophy(parsed.data);
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

      // DB に保存
      await supabase.from("compass_messages").insert({
        id: userMessage.id,
        user_id: user.id,
        role: "user",
        content,
      });

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

          await supabase.from("compass_messages").insert({
            id: assistantMessage.id,
            user_id: user.id,
            role: "assistant",
            content: assistantMessage.content,
          });
        }
      } catch (error) {
        console.error("Failed to send chat message:", error);
      } finally {
        setIsChatLoading(false);
      }
    },
    [supabase]
  );

  const resetChat = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    messagesRef.current = [];
    setMessages([]);
    await supabase.from("compass_messages").delete().eq("user_id", user.id);
  }, [supabase]);

  // ─── Philosophy ──────────────────────────────────────────────────────────

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
      setPhilosophy(p);

      // upsert philosophy
      const { data: existing } = await supabase
        .from("philosophies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let philosophyId: string;

      if (existing) {
        philosophyId = existing.id;
        await supabase.from("philosophies").update({
          title: p.title,
          life_statement: p.lifeStatement,
          beliefs: p.beliefs,
          action_principles: p.actionPrinciples,
        }).eq("id", philosophyId);

        await supabase.from("philosophy_values").delete().eq("philosophy_id", philosophyId);
      } else {
        const { data: newPhil } = await supabase
          .from("philosophies")
          .insert({
            user_id: user.id,
            title: p.title,
            life_statement: p.lifeStatement,
            beliefs: p.beliefs,
            action_principles: p.actionPrinciples,
          })
          .select("id")
          .single();
        if (!newPhil) throw new Error("Philosophy の保存に失敗しました");
        philosophyId = newPhil.id;
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
    } catch (error) {
      console.error("Failed to generate philosophy:", error);
    } finally {
      setIsPhilosophyLoading(false);
    }
  }, [supabase]);

  // ─── Roadmap ─────────────────────────────────────────────────────────────

  const generateRoadmap = useCallback(
    async (goal: string, timeframe: string) => {
      setIsRoadmapLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const response = await fetch("/api/compass/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, timeframe }),
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
    [supabase]
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

      const dbPatch: Record<string, unknown> = {};
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
    // Chat
    messages,
    sendMessage,
    isChatLoading,
    resetChat,
    // Philosophy
    philosophy,
    generatePhilosophy,
    isPhilosophyLoading,
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
