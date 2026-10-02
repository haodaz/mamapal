"use client";
/* eslint-disable @next/next/no-img-element */
// Pal's faces. The mascot was generated with Tongyi Wanxiang (candidates in docs/pal-candidates, poses in docs/pal-poses)
// and cut out of its white background by scripts/cutout.mjs into public/pal-figure.png / public/pal-wave.png.

// Small round avatar for chat bubbles: head-and-chest crop in a white circle.
export function PalFace({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-line ${className}`} style={{ width: size, height: size }} aria-label="Pal">
      <img src="/pal-figure.png" alt="Pal" className="h-full w-full object-cover object-top" style={{ transform: "scale(1.35) translateY(14%)" }} />
    </span>
  );
}

// Bust (head and shoulders, no frame) for the navigation tab.
export function PalBust({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }} aria-label="Pal">
      <img src="/pal-figure.png" alt="Pal" className="h-auto w-full object-top" style={{ transform: "scale(1.15) translateY(2%)" }} />
    </span>
  );
}

// Full figure, transparent, for the home page (standing at the top, sitting at the bottom-left).
export function PalFigure({ pose = "bottle", width = 160, className = "" }: { pose?: "bottle" | "wave"; width?: number; className?: string }) {
  return <img src={pose === "wave" ? "/pal-wave.png" : "/pal-figure.png"} alt="Pal" width={width} className={`pointer-events-none select-none drop-shadow-[0_10px_18px_rgba(40,50,110,0.14)] ${className}`} style={{ width }} />;
}
