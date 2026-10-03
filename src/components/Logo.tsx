"use client";
import Link from "next/link";
import { PalBust } from "./PalFace";

// Wordmark: Pal's bust + "Mama" in a warm sunrise gradient, "Pal" in the brand blue.
// The warmth is on purpose: every mother's days deserve some color.
export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md" | "lg"; href?: string | null }) {
  const px = size === "lg" ? 34 : size === "md" ? 26 : 22;
  const text = size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base";
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <PalBust size={px} />
      <span className={`${text} font-semibold tracking-tight`}>
        <span className="bg-gradient-to-r from-[#ff7a59] via-[#ff9f43] to-[#ffc53d] bg-clip-text text-transparent">Mama</span>
        <span className="text-primary">Pal</span>
      </span>
    </span>
  );
  return href ? <Link href={href} aria-label="MamaPal">{inner}</Link> : inner;
}
