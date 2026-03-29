"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Loader2, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { springTransition } from "@/lib/motion";
import { useDisplayName } from "@/hooks/useDisplayName";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;
  const { displayName, updateDisplayName } = useDisplayName();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) {
          cancelEdit();
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    setEditValue(displayName);
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    setEditValue("");
  };

  const commitEdit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const { error } = await updateDisplayName(editValue);

    if (error) {
      setSaveError(error);
      setIsSaving(false);
      return;
    }

    setIsEditing(false);
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="ユーザーメニュー"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-9 h-9 rounded-xl glass hover:glass-hover transition-colors text-muted-foreground hover:text-foreground"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
        transition={springTransition}
      >
        <User className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={springTransition}
            className="absolute top-full right-0 mt-2 w-56 rounded-2xl glass overflow-hidden"
          >
            {/* ユーザー情報 */}
            <div role="presentation" className="px-4 py-3 border-b border-border/40">
              <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            </div>

            {/* 表示名の編集 */}
            <div className="px-3 py-2">
              <AnimatePresence mode="wait" initial={false}>
                {isEditing ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                        }}
                        disabled={isSaving}
                        maxLength={30}
                        className="flex-1 min-w-0 bg-secondary/40 border border-border/60 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-foreground/30 transition-colors disabled:opacity-50"
                        aria-label="表示名を入力"
                      />
                      <motion.button
                        onClick={commitEdit}
                        disabled={isSaving}
                        className="flex-shrink-0 p-1.5 rounded-lg text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                        whileTap={{ scale: 0.9 }}
                        transition={springTransition}
                        aria-label="保存"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                      <motion.button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                        whileTap={{ scale: 0.9 }}
                        transition={springTransition}
                        aria-label="キャンセル"
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                    {saveError && (
                      <p className="mt-1.5 text-xs text-destructive">{saveError}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="display"
                    role="menuitem"
                    onClick={startEdit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-center gap-2.5 w-full px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/40 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Pencil className="w-4 h-4 flex-shrink-0" />
                    <span>表示名を変更</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* セパレータ */}
            <div className="border-t border-border/40 mx-3" />

            {/* ログアウト */}
            <div className="px-3 py-2">
              <motion.button
                role="menuitem"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-2.5 w-full px-1 py-1.5 text-sm text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileTap={!isSigningOut ? { scale: 0.98 } : {}}
                transition={springTransition}
              >
                {isSigningOut ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{isSigningOut ? "ログアウト中..." : "ログアウト"}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
