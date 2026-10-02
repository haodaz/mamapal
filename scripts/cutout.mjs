// Remove the white studio background from a mascot render: flood-fill near-white pixels connected to the border,
// soften the edge by brightness. Usage: node scripts/cutout.mjs in.png out.png
import sharp from "sharp";
const [,, inPath, outPath] = process.argv;
const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const isBg = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 14; };
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
while (stack.length) {
  const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
  if (!isBg(p * 4)) continue;
  const x = p % W, y = (p / W) | 0;
  if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
}
const bg = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) bg[p] = seen[p] && isBg(p * 4) ? 1 : 0;
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (bg[p]) { data[i + 3] = 0; continue; }
  const x = p % W, y = (p / W) | 0;
  const nearBg = (x > 0 && bg[p - 1]) || (x < W - 1 && bg[p + 1]) || (y > 0 && bg[p - W]) || (y < H - 1 && bg[p + W]);
  if (nearBg) { const br = (data[i] + data[i + 1] + data[i + 2]) / 3; data[i + 3] = Math.round(Math.max(0, Math.min(255, (255 - br) * 2.2))); }
}
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toFile(outPath);
console.log("wrote", outPath);
