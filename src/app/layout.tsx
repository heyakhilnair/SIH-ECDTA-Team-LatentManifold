import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, Azeret_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ECDAT — Enterprise Cryptographic Discovery & Analysis Tool",
  description: "ECDAT is an enterprise cryptographic discovery and quantum-readiness platform developed by LatentManifold for Smart India Hackathon 2026 Problem Statement SIH26164.",
};

import Quby from "@/components/Quby";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${syne.variable} ${azeretMono.variable}`}
      style={{
        "--font-sans": "var(--font-plus-jakarta)",
        "--font-display": "var(--font-syne)",
        "--font-mono": "var(--font-azeret-mono)",
      } as React.CSSProperties}
    >
      <body>
        {children}
        <Quby />
      </body>
    </html>
  );
}
