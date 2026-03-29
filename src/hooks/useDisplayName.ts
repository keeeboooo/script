"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { DisplayNameSchema } from "@/lib/schemas";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

interface UseDisplayNameResult {
  displayName: string;
  isFetching: boolean;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
}

export function useDisplayName(): UseDisplayNameResult {
  const [displayName, setDisplayName] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) {
        setIsFetching(false);
        return;
      }

      const rawDisplayName = data.user.user_metadata["display_name"];
      const emailLocalPart = (data.user.email ?? "").split("@")[0];

      setDisplayName(isString(rawDisplayName) ? rawDisplayName : emailLocalPart);
      setIsFetching(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [supabase]);

  const updateDisplayName = async (name: string): Promise<{ error: string | null }> => {
    const result = DisplayNameSchema.safeParse({ displayName: name });
    if (!result.success) {
      return { error: result.error.errors[0]?.message ?? "入力が無効です" };
    }

    const trimmed = result.data.displayName;
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });

    if (error) {
      return { error: "保存できませんでした。もう一度お試しください。" };
    }

    setDisplayName(trimmed);
    return { error: null };
  };

  return { displayName, isFetching, updateDisplayName };
}
