import type { Lang } from "./i18n";
import { findItem } from "./catalog";

// Where the user is when they call Pal. One template per page type; the item page fills in the item's name.
export type Screen = "plan" | "budget" | "resources" | "me" | "item";
export type PalContext = { screen: Screen; item?: string; itemId?: string };

export function contextFor(pathname: string, lang: Lang, months = 0): PalContext | null {
  if (pathname.startsWith("/item/")) {
    const id = decodeURIComponent(pathname.split("/")[2] ?? "");
    const it = findItem(id, months); // the entry for the child's current stage, so the label matches the page
    return { screen: "item", itemId: id, item: it ? (lang === "zh" ? it.label_zh : it.label_en) : id };
  }
  if (pathname.startsWith("/plan")) return { screen: "plan" };
  if (pathname.startsWith("/budget")) return { screen: "budget" };
  if (pathname.startsWith("/resources")) return { screen: "resources" };
  if (pathname.startsWith("/me")) return { screen: "me" };
  return null;
}

// What the agent is told
export function contextLine(c: PalContext | null): string | undefined {
  if (!c) return undefined;
  return c.screen === "item" ? `item page: ${c.item}` : c.screen;
}
