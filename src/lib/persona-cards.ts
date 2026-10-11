// Light list for the sign-in page (no seeds, no cached reports, safe to ship to the browser).
export type PersonaCard = { id: string; code: string; name: string; place: string; kids: string; blurb: { en: string; zh: string } };
export const PERSONA_CARDS: PersonaCard[] = [
  { id: "maya", code: "MAYA-DEMO", name: "Maya", place: "Houston, TX", kids: "Leo, 4 mo", blurb: { en: "Leo is 4 months, on formula. The formula runs out in about four days.", zh: "Leo 4 个月，喝奶粉。奶粉大概 4 天后见底。" } },
  { id: "rosa", code: "ROSA-DEMO", name: "Rosa", place: "Columbus, OH", kids: "Mateo, 2 · baby due", blurb: { en: "Mateo is 2. A new baby is due in two months. Already on SNAP and Medicaid.", zh: "Mateo 2 岁，老二两个月后出生。已经在领 SNAP 和 Medicaid。" } },
  { id: "keisha", code: "KEISHA-DEMO", name: "Keisha", place: "Fresno, CA", kids: "Amara, 10 mo · Jordan, 4", blurb: { en: "Amara is 10 months, breastfed, with a dairy allergy. Jordan is 4.", zh: "Amara 10 个月，母乳，牛奶过敏。Jordan 4 岁。" } },
];
