import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ECDAT — Enterprise Cryptographic Discovery & Analysis Tool",
  description: "ECDAT is an enterprise cryptographic discovery and quantum-readiness platform developed by LatentManifold for Smart India Hackathon 2026 Problem Statement SIH26164.",
};

import Quby from "@/components/Quby";
import CommandPalette from "@/components/CommandPalette";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      style={{
        "--font-sans": "var(--font-inter)",
        "--font-display": "var(--font-outfit)",
        "--font-mono": "var(--font-jetbrains-mono)",
      } as React.CSSProperties}
    >
      <body>
        {children}
        <Quby />
        <CommandPalette />
      </body>
    </html>
  );
}
