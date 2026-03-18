"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PhilosophySchema,
  RoadmapResponseSchema,
  StoredChatMessageSchema,
  StoredRoadmapSchema,
  ChatResponseSchema,
} from "@/lib/schemas";

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
}

export interface Roadmap {
  id: string;
  createdAt: string;
  title?: string;
  goal: string;
  timeframe: string;
  milestones: Milestone[];
}

const STORAGE_KEY_MESSAGES = "compass-messages";
const STORAGE_KEY_PHILOSOPHY = "compass-philosophy";
const STORAGE_KEY_ROADMAPS = "compass-roadmaps";

export function useCompass() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [philosophy, setPhilosophy] = useState<Philosophy | null>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPhilosophyLoading, setIsPhilosophyLoading] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      const savedPhilosophy = localStorage.getItem(STORAGE_KEY_PHILOSOPHY);
      const savedRoadmaps = localStorage.getItem(STORAGE_KEY_ROADMAPS);

      if (savedMessages) {
        const result = StoredChatMessageSchema.array().safeParse(JSON.parse(savedMessages));
        if (result.success) {
          setMessages(result.data);
          messagesRef.current = result.data;
        }
      }
      if (savedPhilosophy) {
        const result = PhilosophySchema.safeParse(JSON.parse(savedPhilosophy));
        if (result.success) setPhilosophy(result.data);
      }
      if (savedRoadmaps) {
        const result = StoredRoadmapSchema.array().safeParse(JSON.parse(savedRoadmaps));
        if (result.success) setRoadmaps(result.data);
      }
    } catch (e) {
      console.error("Failed to load compass data from localStorage:", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage — only after hydration to avoid overwriting with initial values
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (philosophy) {
      localStorage.setItem(STORAGE_KEY_PHILOSOPHY, JSON.stringify(philosophy));
    }
  }, [philosophy, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY_ROADMAPS, JSON.stringify(roadmaps));
  }, [roadmaps, isHydrated]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const updated = [...messagesRef.current, userMessage];
    messagesRef.current = updated;
    setMessages(updated);

    setIsChatLoading(true);
    try {
      const response = await fetch("/api/compass/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

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
      }
    } catch (error) {
      console.error("Failed to send chat message:", error);
    } finally {
      setIsChatLoading(false);
    }
  }, []);

  const generatePhilosophy = useCallback(async () => {
    setIsPhilosophyLoading(true);

    try {
      const currentMessages = messagesRef.current;
      if (currentMessages.length < 2) return;

      const response = await fetch("/api/compass/philosophy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Philosophy API error: ${response.status}`);
      }

      const parsed = PhilosophySchema.safeParse(await response.json());
      if (parsed.success) {
        setPhilosophy(parsed.data);
      }
    } catch (error) {
      console.error("Failed to generate philosophy:", error);
    } finally {
      setIsPhilosophyLoading(false);
    }
  }, []);

  const generateRoadmap = useCallback(async (goal: string, timeframe: string) => {
    setIsRoadmapLoading(true);

    try {
      const response = await fetch("/api/compass/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, timeframe }),
      });

      if (!response.ok) {
        throw new Error(`Roadmap API error: ${response.status}`);
      }

      const parsed = RoadmapResponseSchema.safeParse(await response.json());
      if (parsed.success) {
        const newRoadmap: Roadmap = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          goal: parsed.data.goal ?? goal,
          timeframe: parsed.data.timeframe ?? timeframe,
          milestones: parsed.data.milestones.map((m) => ({
            ...m,
            id: crypto.randomUUID(),
            isImported: false,
          })),
        };
        setRoadmaps((prev) => [newRoadmap, ...prev]);
        return newRoadmap.id;
      }
    } catch (error) {
      console.error("Failed to generate roadmap:", error);
    } finally {
      setIsRoadmapLoading(false);
    }
    return null;
  }, []);

  const markMilestoneImported = useCallback((roadmapId: string, milestoneId: string) => {
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
  }, []);

  const deleteRoadmap = useCallback((roadmapId: string) => {
    setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
  }, []);

  const updateRoadmap = useCallback(
    (roadmapId: string, patch: Partial<Pick<Roadmap, "title" | "goal" | "timeframe">>) => {
      setRoadmaps((prev) =>
        prev.map((r) => (r.id === roadmapId ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const addMilestone = useCallback((roadmapId: string, milestone: Omit<Milestone, "id">) => {
    setRoadmaps((prev) =>
      prev.map((r) =>
        r.id === roadmapId
          ? {
              ...r,
              milestones: [
                ...r.milestones,
                { ...milestone, id: crypto.randomUUID() },
              ],
            }
          : r
      )
    );
  }, []);

  const updateMilestone = useCallback(
    (roadmapId: string, milestoneId: string, patch: Partial<Pick<Milestone, "period" | "title" | "description" | "keyActions">>) => {
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
    },
    []
  );

  const deleteMilestone = useCallback((roadmapId: string, milestoneId: string) => {
    setRoadmaps((prev) =>
      prev.map((r) =>
        r.id === roadmapId
          ? { ...r, milestones: r.milestones.filter((m) => m.id !== milestoneId) }
          : r
      )
    );
  }, []);

  const resetChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  }, []);

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
