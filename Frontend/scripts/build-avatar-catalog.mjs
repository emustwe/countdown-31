import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogDir = path.join(root, "public", "assets", "avatar-catalog", "cow-v1");
const sourceDir = path.join(catalogDir, "source");
const layerDir = path.join(catalogDir, "layers");
const renderDir = path.join(catalogDir, "renders");

await mkdir(layerDir, { recursive: true });
await mkdir(renderDir, { recursive: true });

const basePath = path.join(sourceDir, "base-cow-v1.png");
const glassesPath = path.join(layerDir, "glasses-gold-aviator.png");
const hatSourcePath = path.join(sourceDir, "hat-cowboy-ai-source.png");
const hatLayerPath = path.join(layerDir, "hat-cowboy.png");

const trimmedHat = await sharp(hatSourcePath).trim({ background: "transparent" }).resize({ width: 500 }).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "transparent" } })
  .composite([{ input: trimmedHat, left: 262, top: 102 }])
  .png()
  .toFile(hatLayerPath);

const variants = [
  { id: "cow_v1_base", label: "Classic", hatId: null, glassesId: null, layers: [] },
  { id: "cow_v1_glasses", label: "Cool Glasses", hatId: null, glassesId: "gold_aviator", layers: [glassesPath] },
  { id: "cow_v1_cowboy", label: "Cowboy Hat", hatId: "cowboy", glassesId: null, layers: [hatLayerPath] },
  { id: "cow_v1_cowboy_glasses", label: "Cowboy Cool", hatId: "cowboy", glassesId: "gold_aviator", layers: [glassesPath, hatLayerPath] },
];

for (const variant of variants) {
  const outputPath = path.join(renderDir, `${variant.id}.webp`);
  await sharp(basePath)
    .composite(variant.layers.map((input) => ({ input })))
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath);
  variant.image = `/assets/avatar-catalog/cow-v1/renders/${variant.id}.webp`;
  variant.sha256 = createHash("sha256").update(await readFile(outputPath)).digest("hex");
  delete variant.layers;
}

await writeFile(
  path.join(catalogDir, "manifest.json"),
  `${JSON.stringify({ catalogId: "cow-v1", version: 1, variants }, null, 2)}\n`,
);

console.log(`Built ${variants.length} immutable avatar variants in ${renderDir}`);
