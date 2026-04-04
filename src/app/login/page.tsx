"use client";

import { createClient } from "@/lib/supabase/client";
import { springTransition } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") === "auth_callback_failed";
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full space-y-12">
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
      >
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          Follow the Script.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
          AIがあなたのタスクを実行可能なステップに分解します。
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-4 w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.15 }}
      >
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={springTransition}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>ログインに失敗しました。もう一度お試しください。</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-2xl glass hover:glass-hover font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={!isLoggingIn ? { y: -2 } : {}}
          whileTap={!isLoggingIn ? { scale: 0.97 } : {}}
          transition={springTransition}
        >
          {isLoggingIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {isLoggingIn ? "ログイン中..." : "Google でログイン"}
        </motion.button>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"
      />
      <path
        fill="#34A853"
        d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"
      />
      <path
        fill="#FBBC05"
        d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"
      />
      <path
        fill="#EA4335"
        d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="h-10 w-64 bg-white/10 rounded-lg mx-auto animate-pulse" />
          <div className="h-5 w-80 bg-white/5 rounded mx-auto animate-pulse" />
        </div>
        <div className="w-full max-w-sm h-12 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
