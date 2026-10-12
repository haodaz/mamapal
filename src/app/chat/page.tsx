"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PalFace } from "@/components/PalFace";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";

// The list of conversations with Pal (on desktop the same list sits in the sidebar). Each opens on the home page.
export default function ChatList() {
  const { t, lang } = useLang();
  const { data } = useAppState();
  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const convs = data.state.conversations ?? [];
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  return (
    <main className="mx-auto max-w-[720px] px-4 pt-4 md:px-6 md:pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("conv.list_title")}</h1>
        <Link href="/?new=1" className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white"><Plus className="h-4 w-4" />{t("nav.new")}</Link>
      </div>
      {convs.length === 0 && <p className="mt-6 text-sm text-muted">{t("conv.list_empty")}</p>}
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel shadow-sm">
        {convs.map((c) => (
          <li key={c.id}>
            <Link href={`/?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
              <PalFace size={26} />
              <span className="min-w-0 flex-1 truncate text-sm">{c.title || "…"}</span>
              <span className="num shrink-0 text-xs text-muted">{c.items.length} · {fmt(c.updated_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
