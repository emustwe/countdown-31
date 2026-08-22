import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogDir = path.join(root, "public", "assets", "avatar-catalog", "cow-v1");
const sourceDir = path.join(catalogDir, "source");
const renderDir = path.join(catalogDir, "renders");

await mkdir(renderDir, { recursive: true });

const basePath = path.join(sourceDir, "base-cow-v1.png");

const variants = [
  { id: "cow_v1_base", label: "Classic", hatId: null, glassesId: null, source: basePath },
  { id: "cow_v1_glasses", label: "Cool Glasses", hatId: null, glassesId: "gold_aviator", source: path.join(sourceDir, "static-glasses.png") },
  { id: "cow_v1_cowboy", label: "Cowboy Hat", hatId: "cowboy", glassesId: null, source: path.join(sourceDir, "static-cowboy.png") },
  { id: "cow_v1_cowboy_glasses", label: "Cowboy Cool", hatId: "cowboy", glassesId: "gold_aviator", source: path.join(sourceDir, "static-cowboy-glasses.png") },
];

for (const variant of variants) {
  const renderName = variant.id === "cow_v1_base" ? `${variant.id}.webp` : `${variant.id}_static_v2.webp`;
  const outputPath = path.join(renderDir, renderName);
  await sharp(variant.source)
    .resize(1024, 1024, { fit: "contain", background: "transparent" })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath);
  variant.image = `/assets/avatar-catalog/cow-v1/renders/${renderName}`;
  variant.sha256 = createHash("sha256").update(await readFile(outputPath)).digest("hex");
  delete variant.source;
}

await writeFile(
  path.join(catalogDir, "manifest.json"),
  `${JSON.stringify({ catalogId: "cow-v1", version: 1, variants }, null, 2)}\n`,
);

console.log(`Optimized ${variants.length} approved static avatar renders in ${renderDir}`);
