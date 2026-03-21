"use client";

import { usePathname, useRouter } from "next/navigation";
import { ModeSwitch } from "@/components/ui/ModeSwitch";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";
import { springTransition } from "@/lib/motion";
import { useState } from "react";

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === "/login") return null;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
      <ModeSwitch />
      <motion.button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground glass hover:glass-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={!isSigningOut ? { y: -1 } : {}}
        whileTap={!isSigningOut ? { scale: 0.97 } : {}}
        transition={springTransition}
        aria-label="ログアウト"
      >
        {isSigningOut ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {isSigningOut ? "ログアウト中..." : "ログアウト"}
        </span>
      </motion.button>
    </header>
  );
}
