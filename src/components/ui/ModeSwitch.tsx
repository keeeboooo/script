"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { springTransition } from "@/lib/motion";

const modes = [
  { href: "/", label: "Engine", icon: Flame, description: "Engine" },
  { href: "/compass", label: "Compass", icon: Compass, description: "Compass" },
] as const;

export function ModeSwitch() {
  const pathname = usePathname();
  const isCompass = pathname.startsWith("/compass");
  const activeIndex = isCompass ? 1 : 0;

  return (
    <nav className="flex items-center gap-1 p-1 rounded-2xl glass" role="tablist" aria-label="ナビゲーションモード">
      {modes.map((mode, index) => {
        const isActive = index === activeIndex;
        const Icon = mode.icon;

        return (
          <Link
            key={mode.href}
            href={mode.href}
            role="tab"
            aria-selected={isActive}
            className="relative"
          >
            <motion.div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative z-10",
                isActive
                  ? isCompass
                    ? "text-compass"
                    : "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
              whileHover={!isActive ? { y: -1 } : {}}
              whileTap={!isActive ? { scale: 0.97 } : {}}
              transition={springTransition}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mode.label}</span>
              <span className="sm:hidden text-xs">{mode.description}</span>
            </motion.div>

            {isActive && (
              <motion.div
                layoutId="mode-indicator"
                className={cn(
                  "absolute inset-0 rounded-xl border",
                  isCompass
                    ? "bg-compass-subtle border-compass-border"
                    : "bg-secondary/40 border-border/40"
                )}
                transition={springTransition}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
