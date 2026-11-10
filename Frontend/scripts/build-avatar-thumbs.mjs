/**
 * Build the small avatar renders that the game actually shows.
 *
 * The catalog ships 1024x1024 masters at ~1MB each; every in-game slot draws them at 60-120 CSS px.
 * Five players meant a five-megabyte arena that a weak connection never finished, which is why
 * avatars came up blank — and five 1024px decodes on the main thread before first paint, which is
 * why it felt heavy on browsers with less memory headroom than Safari.
 *
 * Run after adding or replacing a catalog render:
 *     node scripts/build-avatar-thumbs.mjs
 *
 * Output goes to renders/sm/ under the same filename, which is what `smallAvatarImage()` points at.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/** 384px: 3x a 128px slot on a 3x screen, so it is still oversampled at the largest size used. */
const EDGE = 384;
const QUALITY = 82;

const manifestPath = "public/assets/avatar-catalog/cow-v1/manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const outDir = "public/assets/avatar-catalog/cow-v1/renders/sm";
fs.mkdirSync(outDir, { recursive: true });

let before = 0;
let after = 0;
let built = 0;
for (const variant of manifest.variants ?? []) {
  const src = path.join("public", variant.image);
  if (!fs.existsSync(src)) {
    console.warn(`missing master, skipped: ${variant.image}`);
    continue;
  }
  const out = path.join(outDir, path.basename(variant.image));
  await sharp(src).resize(EDGE, EDGE, { fit: "inside", withoutEnlargement: true }).webp({ quality: QUALITY, effort: 6 }).toFile(out);
  before += fs.statSync(src).size;
  after += fs.statSync(out).size;
  built++;
}

const mb = (n) => (n / 1048576).toFixed(2);
console.log(`${built} avatars  ${mb(before)} MB -> ${mb(after)} MB  (${(before / after).toFixed(0)}x smaller)`);
