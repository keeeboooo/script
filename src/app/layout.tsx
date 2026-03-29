import type { Metadata } from "next";
import "./globals.css";
import { HeaderNav } from "@/components/ui/HeaderNav";

export const metadata: Metadata = {
  title: "Script",
  description: "Follow the Script. AI-powered task breakdown and execution partner.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Script",
    description: "Follow the Script. AI-powered task breakdown and execution partner.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Script",
    description: "Follow the Script. AI-powered task breakdown and execution partner.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased text-foreground min-h-screen">
        {/* Subtle top line for premium feel */}
        <div className="fixed top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent z-50 pointer-events-none" />

        <HeaderNav />

        <main className="max-w-3xl mx-auto px-4 sm:px-8 pt-14 pb-8 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

