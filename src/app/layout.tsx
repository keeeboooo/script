import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModeSwitch } from "@/components/ui/ModeSwitch";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Script - 人生のアルゴリズム",
  description: "AI駆動のタスク分解・実行支援パートナー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`dark ${inter.variable}`}>
      <body className="antialiased text-foreground min-h-screen font-[family-name:var(--font-inter)]">
        {/* Subtle top glow line for premium feel */}
        <div className="fixed top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-50 pointer-events-none" />

        {/* Mode Switch Navigation */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <ModeSwitch />
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-8 py-16 sm:py-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

