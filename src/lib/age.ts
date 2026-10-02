import type { Lang } from "./i18n";

// born is "YYYY-MM"
export function monthsSince(born: string, now = new Date()): number {
  const m = /^(\d{4})-(\d{1,2})$/.exec(born);
  if (!m) return 0;
  const y = Number(m[1]), mo = Number(m[2]);
  return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo));
}

export function formatAge(months: number, lang: Lang): string {
  if (lang === "zh") {
    if (months < 24) return `${months} 个月`;
    const y = Math.floor(months / 12), r = months % 12;
    return r ? `${y} 岁 ${r} 个月` : `${y} 岁`;
  }
  if (months < 24) return `${months} mo`;
  const y = Math.floor(months / 12), r = months % 12;
  return r ? `${y}y ${r}m` : `${y}y`;
}

export function correctedMonths(c: { born: string; gestational_weeks?: number }, now = new Date()): number {
  const m = monthsSince(c.born, now);
  if (!c.gestational_weeks || c.gestational_weeks >= 37) return m;
  return Math.max(0, m - Math.round((40 - c.gestational_weeks) / 4.345));
}
