"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";
import type { ChatMessage } from "@/hooks/useCompass";

interface PhilosophyChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onGeneratePhilosophy: () => void;
  onResetChat: () => void;
  isChatLoading: boolean;
  isPhilosophyLoading: boolean;
}

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.95, transition: { ...springTransition, duration: 0.15 } },
};

export function PhilosophyChat({
  messages,
  onSendMessage,
  onGeneratePhilosophy,
  onResetChat,
  isChatLoading,
  isPhilosophyLoading,
}: PhilosophyChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    onSendMessage(input);
    setInput("");
  };

  const canGeneratePhilosophy = messages.length >= 4 && !isChatLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-compass" />
          <h2 className="text-lg font-semibold tracking-tight">価値観を発掘する</h2>
        </div>
        <div className="flex items-center gap-2">
          {canGeneratePhilosophy && (
            <motion.button
              onClick={onGeneratePhilosophy}
              disabled={isPhilosophyLoading}
              aria-busy={isPhilosophyLoading}
              aria-label={isPhilosophyLoading ? "哲学を生成中" : "あなたの哲学を生成"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-compass-subtle text-compass border border-compass-border hover:bg-compass/20 transition-colors disabled:opacity-50"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springTransition}
            >
              <BookOpen className="w-4 h-4" />
              {isPhilosophyLoading ? "生成中..." : "哲学を生成"}
            </motion.button>
          )}
          {messages.length > 0 && (
            <motion.button
              onClick={onResetChat}
              aria-label="対話をリセット"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              title="対話をリセット"
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 max-h-[400px] min-h-[200px]"
      >
        {messages.length === 0 && !isChatLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <Sparkles className="w-8 h-8 text-compass/40 mb-4" />
            <p className="text-muted-foreground text-sm max-w-xs">
              AIコーチとの対話で、あなたの価値観を発掘しましょう。まずは何か話しかけてみてください。
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              variants={messageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "bubble-user rounded-br-md"
                    : "bubble-assistant rounded-bl-md"
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isChatLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bubble-assistant rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-compass/60 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-compass/40 animate-pulse [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-compass/20 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center glass-compass rounded-2xl p-2 focus-within:glass-compass-hover transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? "こんにちは、と話しかけてみましょう..." : "メッセージを入力..."}
            aria-label="AIコーチへのメッセージを入力"
            aria-busy={isChatLoading}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 px-3 py-2 text-sm"
            disabled={isChatLoading}
          />
        </div>
        <motion.button
          type="submit"
          disabled={!input.trim() || isChatLoading}
          aria-label="メッセージを送信"
          whileHover={!input.trim() || isChatLoading ? {} : { y: -2, scale: 1.05 }}
          whileTap={!input.trim() || isChatLoading ? {} : { scale: 0.95 }}
          transition={springTransition}
          className={cn(
            "p-3 rounded-xl flex items-center justify-center transition-colors",
            input.trim() && !isChatLoading
              ? "bg-compass text-white hover:bg-compass-muted"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </form>
    </div>
  );
}
