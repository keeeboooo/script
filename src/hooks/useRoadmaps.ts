"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Roadmap, Milestone } from "@/hooks/useCompass";

function rowToMilestone(row: {
  id: string;
  period: string;
  title: string;
  description: string;
  key_actions: string[];
  is_imported: boolean;
  is_completed?: boolean;
  completed_at?: string | null;
}): Milestone {
  return {
    id: row.id,
    period: row.period,
    title: row.title,
    description: row.description,
    keyActions: row.key_actions,
    isImported: row.is_imported,
    isCompleted: row.is_completed ?? false,
    completedAt: row.completed_at ?? undefined,
  };
}

export function useRoadmaps() {
  const supabase = useMemo(() => createClient(), []);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("roadmaps")
        .select("*, milestones(*)")
        .order("created_at", { ascending: false });

      if (!data) return;

      const mapped: Roadmap[] = data.map((r) => {
        const milestones = (r.milestones as Parameters<typeof rowToMilestone>[0][])
          .map(rowToMilestone)
          .sort((a, b) => (a.period > b.period ? 1 : -1));
        return {
          id: r.id,
          createdAt: r.created_at,
          title: r.title ?? undefined,
          goal: r.goal,
          timeframe: r.timeframe,
          milestones,
        };
      });

      setRoadmaps(mapped);
    };

    void fetch();
  }, [supabase]);

  return roadmaps;
}
