import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ECDAT — Enterprise Cryptographic Discovery & Analysis Tool",
  description: "ECDAT is an enterprise cryptographic discovery and quantum-readiness platform developed by LatentManifold for Smart India Hackathon 2026 Problem Statement SIH26164.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      style={{
        "--font-sans": "var(--font-inter)",
        "--font-display": "var(--font-space-grotesk)",
        "--font-mono": "var(--font-jetbrains-mono)",
      } as React.CSSProperties}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
