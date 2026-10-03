"use client";
/* eslint-disable @next/next/no-img-element */
import type { Child } from "@/lib/types";

// Round avatar for a child: her own photo if she uploaded one, else the illustrated baby that lives in Pal's world.
export function BabyAvatar({ child, size = 48, className = "" }: { child: Child; size?: number; className?: string }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white shadow-sm ${className}`} style={{ width: size, height: size }}>
      <img src={child.photo || "/baby.png"} alt={child.name || "baby"} className="h-full w-full object-cover" />
    </span>
  );
}
