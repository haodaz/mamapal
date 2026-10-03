"use client";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { PalFace } from "./PalFace";

// In-flow entry to the conversation: looks like an input, sits at the top of the page content.
export function AskPalBar({ name, from }: { name: string; from: "plan" | "budget" | "resources" | "me" }) {
  const { t } = useLang();
  return (
    <Link href={`/chat?from=${from}`} className="mb-5 flex items-center gap-3 rounded-full border border-line bg-panel py-2 pl-2 pr-4 text-sm text-muted shadow-sm hover:border-primary">
      <PalFace size={30} />
      <span className="flex-1 truncate">{t("pal.askbar", { name })}</span>
      <span className="typing"><i /><i /><i /></span>
    </Link>
  );
}
