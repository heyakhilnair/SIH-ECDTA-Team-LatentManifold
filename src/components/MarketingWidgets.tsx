"use client";

import { usePathname } from "next/navigation";
import Quby from "./Quby";
import CommandPalette from "./CommandPalette";

export default function MarketingWidgets() {
  const pathname = usePathname();

  // Only render Quby and CommandPalette on the landing page ("/") and standard marketing pages.
  // Hide them on /prototype, /sign-in, /sign-up, etc.
  if (pathname !== "/") {
    return null;
  }

  return (
    <>
      <Quby />
      <CommandPalette />
    </>
  );
}
