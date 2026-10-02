"use client";
/* eslint-disable @next/next/no-img-element */
// Pal's face: the illustrated mascot (public/pal.png, generated with Tongyi Wanxiang; candidates in docs/pal-candidates)
// cropped into a white circle so its white background reads as a soft badge on the paper-colored page.
export function PalFace({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-line ${className}`}
      style={{ width: size, height: size }}
      aria-label="Pal"
    >
      <img src="/pal.png" alt="Pal" width={size} height={size} className="h-full w-full object-cover" style={{ transform: "scale(1.08)" }} />
    </span>
  );
}
