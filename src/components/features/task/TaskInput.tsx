"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";

interface TaskInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

export function TaskInput({ onSubmit, isLoading }: TaskInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex items-center w-full max-w-2xl mx-auto rounded-2xl",
        "glass p-2 transition-colors duration-300 focus-within:glass-hover"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: 0.1 }}
    >
      <div className="pl-4 pr-3 flex items-center justify-center text-muted-foreground">
        <ListTodo className="w-5 h-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="やりたいことを入力... 例:「うどん手作り」"
        aria-label="新しいタスクを入力"
        aria-busy={isLoading}
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-3 text-base sm:text-lg"
        disabled={isLoading}
      />
      <div className="pr-2">
        <motion.button
          type="submit"
          disabled={!value.trim() || isLoading}
          aria-label="タスクを追加"
          whileHover={!value.trim() || isLoading ? {} : { y: -2, scale: 1.05 }}
          whileTap={!value.trim() || isLoading ? {} : { scale: 0.95 }}
          transition={springTransition}
          className={cn(
            "p-3 rounded-xl flex items-center justify-center transition-colors",
            value.trim() && !isLoading
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          <Sparkles className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.form>
  );
}
