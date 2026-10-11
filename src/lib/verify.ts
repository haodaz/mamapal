import type { LinkCheck } from "./types";

// The verifier's hands. No model here: it opens pages and reads them, so what the agents claim can be checked
// against what the page actually says. Used by the month run, the price check and the benefits finder.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36";

async function get(url: string, ms = 9000): Promise<{ status: number; html: string; binary?: boolean } | { error: "dead" | "blocked" }> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en" } });
    clearTimeout(timer);
    if (r.status === 404 || r.status === 410) return { error: "dead" };
    if (!r.ok) return { error: "blocked" };
    if (/pdf|octet-stream/i.test(r.headers.get("content-type") ?? "")) return { status: r.status, html: "", binary: true };
    return { status: r.status, html: (await r.text()).slice(0, 3_000_000) };
  } catch (e) {
    return { error: /ENOTFOUND|EAI_AGAIN|ERR_INVALID_URL|Invalid URL/.test(String((e as Error).cause ?? e)) ? "dead" : "blocked" };
  }
}

// ok = the page opened and shows this price; opens = it opened, price not visible to a robot;
// blocked = the site refuses robots or timed out (not disproven); dead = no such page.
export async function openLink(url: string, price?: number): Promise<LinkCheck> {
  const r = await get(url, 8000);
  if ("error" in r) return r.error;
  if (price == null) return "ok";
  const p = price.toFixed(2);
  return r.html.includes(p) || r.html.includes(`"price":${p}`) || r.html.includes(`${Math.floor(price)}<`) ? "ok" : "opens";
}

function text(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&rsquo;|&#8217;|&lsquo;|&#8216;/g, "'").replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/g, '"').replace(/&ndash;|&mdash;|&#8211;|&#8212;/g, "-");
}
const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/(\d),(\d{3})/g, "$1$2").replace(/\s+/g, " ").trim();
const numbers = (s: string) => (norm(s).match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => n.length > 1 || s.length < 40);
const words = (s: string) => norm(s).split(/[^a-z0-9$%.]+/).filter((w) => w.length > 2);

export type QuoteCheck = "found" | "close" | "not_found" | "unreachable";

// found = the quoted sentence is on the page word for word; close = every number in it and most of its words are
// on the page (tables and line breaks split sentences); not_found = the page opened but does not say this.
export async function checkQuote(url: string, quote: string): Promise<{ result: QuoteCheck; link: LinkCheck }> {
  const r = await get(url);
  if ("error" in r) return { result: "unreachable", link: r.error };
  if (r.binary) return { result: "unreachable", link: "opens" }; // a PDF: it opens, but this checker cannot read it
  const page = norm(text(r.html));
  const q = norm(quote);
  if (q && page.includes(q)) return { result: "found", link: "ok" };
  const nums = numbers(quote);
  const ws = words(quote);
  const hitNums = nums.every((n) => page.includes(n));
  const hitWords = ws.length ? ws.filter((w) => page.includes(w)).length / ws.length : 0;
  return { result: hitNums && nums.length > 0 && hitWords >= 0.7 ? "close" : "not_found", link: "opens" };
}

// Government (.gov, .us, .mil) or a small list of national program networks.
const OFFICIAL = ["nationaldiaperbanknetwork.org", "usac.org", "211.org", "benefits.gov", "healthcare.gov", "irs.gov", "lifelinesupport.org", "feedingamerica.org", "headstart.gov", "reachoutandread.org"];
export function isOfficial(url: string | null | undefined) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /\.(gov|us|mil)$/.test(h) || OFFICIAL.some((d) => h === d || h.endsWith(`.${d}`));
  } catch { return false; }
}
