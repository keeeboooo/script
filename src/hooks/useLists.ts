"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { ListSchema } from "@/lib/schemas";

export type List = z.infer<typeof ListSchema>;

export function useLists() {
  const supabase = useMemo(() => createClient(), []);
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("lists")
        .select("*")
        .order("position", { ascending: true });

      if (!data) return;

      const mapped = data
        .map((r) =>
          ListSchema.safeParse({
            id: r.id,
            name: r.name,
            position: r.position,
            createdAt: r.created_at,
          })
        )
        .filter((r): r is { success: true; data: List } => r.success)
        .map((r) => r.data);

      setLists(mapped);
    };

    void fetch();
  }, [supabase]);

  const createList = useCallback(
    async (name: string): Promise<List | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const position = lists.length;

      const { data, error } = await supabase
        .from("lists")
        .insert({ user_id: user.id, name: trimmed, position })
        .select()
        .single();

      if (error || !data) return null;

      const parsed = ListSchema.safeParse({
        id: data.id,
        name: data.name,
        position: data.position,
        createdAt: data.created_at,
      });

      if (!parsed.success) return null;

      setLists((prev) => [...prev, parsed.data]);
      return parsed.data;
    },
    [lists, supabase]
  );

  const deleteList = useCallback(
    async (id: string) => {
      setLists((prev) => prev.filter((l) => l.id !== id));
      await supabase.from("lists").delete().eq("id", id);
    },
    [supabase]
  );

  const renameList = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setLists((prev) =>
        prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l))
      );
      await supabase.from("lists").update({ name: trimmed }).eq("id", id);
    },
    [supabase]
  );

  return { lists, createList, deleteList, renameList };
}
