"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ListTodo, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";

const PLACEHOLDER_EXAMPLES = [
  "やりたいことを入力...",
  "「うどんを手作りしてみたい」",
  "「ワイン学習アプリを作りたい」",
  "「部屋を断捨離する」",
  "「英語のプレゼンを準備する」",
] as const;

interface TaskInputProps {
  onSubmit: (prompt: string) => void;
  onAdd?: (title: string, listId?: string) => void;
  selectedListId?: string | null;
  isLoading?: boolean;
}

export function TaskInput({ onSubmit, onAdd, selectedListId, isLoading }: TaskInputProps) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value);
    setValue("");
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onAdd?.(value, selectedListId ?? undefined);
    setValue("");
  };

  const hasValue = value.trim().length > 0;

  return (
    <motion.form
      onSubmit={handleBreakdown}
      className={cn(
        "relative flex items-center w-full max-w-2xl mx-auto rounded-2xl",
        "glass p-2 transition-colors duration-300 focus-within:glass-hover"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: 0.1 }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="pl-4 pr-3 flex items-center justify-center text-muted-foreground">
        <ListTodo className="w-5 h-5" />
      </div>
      <div className="relative flex-1 py-2 cursor-text">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="新しいタスクを入力"
          aria-busy={isLoading}
          className="w-full bg-transparent border-none outline-none text-foreground text-sm"
          disabled={isLoading}
        />
        {!value && (
          <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground/50 whitespace-nowrap"
              >
                {PLACEHOLDER_EXAMPLES[placeholderIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ボタンエリア */}
      <AnimatePresence mode="wait">
        {hasValue ? (
          <motion.div
            key="two-buttons"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={springTransition}
            className="flex items-center gap-1.5 pr-2"
          >
            {/* そのまま追加ボタン */}
            <motion.button
              type="button"
              onClick={handleAdd}
              disabled={isLoading}
              aria-label="そのまま追加"
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              className="p-3 rounded-xl flex items-center justify-center transition-colors bg-secondary text-foreground hover:bg-secondary/80"
            >
              <Plus className="w-5 h-5" />
            </motion.button>

            {/* Magic Breakdownボタン */}
            <motion.button
              type="submit"
              disabled={isLoading}
              aria-label="AIで分解して追加"
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              className="p-3 rounded-xl flex items-center justify-center transition-colors bg-foreground text-background hover:bg-foreground/90"
            >
              <Sparkles className="w-5 h-5" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="single-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springTransition}
            className="pr-2"
          >
            <div className="p-3 rounded-xl flex items-center justify-center bg-secondary text-muted-foreground cursor-not-allowed">
              <Sparkles className="w-5 h-5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
