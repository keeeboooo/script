"use client";

import { usePathname } from "next/navigation";
import { ModeSwitch } from "@/components/ui/ModeSwitch";
import { UserMenu } from "@/components/ui/UserMenu";

export function HeaderNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
        <ModeSwitch />
      </div>
      <div className="fixed top-4 right-4 z-40">
        <UserMenu />
      </div>
    </>
  );
}
