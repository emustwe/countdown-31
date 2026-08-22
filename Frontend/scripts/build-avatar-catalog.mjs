import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogDir = path.join(root, "public", "assets", "avatar-catalog", "cow-v1");
const sourceDir = path.join(catalogDir, "source");
const renderDir = path.join(catalogDir, "renders");

await mkdir(renderDir, { recursive: true });

const variants = [
  { id: "cow_v1_base", characterId: "champion", characterLabel: "Champion", label: "Classic", hatId: null, glassesId: null, source: path.join(sourceDir, "base-cow-v1.png"), renderName: "cow_v1_base.webp" },
  { id: "cow_v1_glasses", characterId: "champion", characterLabel: "Champion", label: "Cool Glasses", hatId: null, glassesId: "gold_aviator", source: path.join(sourceDir, "static-glasses.png"), renderName: "cow_v1_glasses_static_v2.webp" },
  { id: "cow_v1_cowboy", characterId: "champion", characterLabel: "Champion", label: "Cowboy Hat", hatId: "cowboy", glassesId: null, source: path.join(sourceDir, "static-cowboy.png"), renderName: "cow_v1_cowboy_static_v2.webp" },
  { id: "cow_v1_cowboy_glasses", characterId: "champion", characterLabel: "Champion", label: "Cowboy Cool", hatId: "cowboy", glassesId: "gold_aviator", source: path.join(sourceDir, "static-cowboy-glasses.png"), renderName: "cow_v1_cowboy_glasses_static_v2.webp" },
  ...collection("daisy", "Daisy", "daisy"),
  ...collection("rusty", "Rusty", "rusty"),
  ...collection("nova", "Nova", "nova"),
];

function collection(characterId, characterLabel, sourcePrefix) {
  return [
    { id: `${characterId}_v1_base`, characterId, characterLabel, label: `${characterLabel} Classic`, hatId: null, glassesId: null, source: path.join(sourceDir, `${sourcePrefix}-base.png`) },
    { id: `${characterId}_v1_glasses`, characterId, characterLabel, label: `${characterLabel} Glasses`, hatId: null, glassesId: "gold_aviator", source: path.join(sourceDir, `${sourcePrefix}-glasses.png`) },
    { id: `${characterId}_v1_cowboy`, characterId, characterLabel, label: `${characterLabel} Cowboy`, hatId: "cowboy", glassesId: null, source: path.join(sourceDir, `${sourcePrefix}-cowboy.png`) },
    { id: `${characterId}_v1_cowboy_glasses`, characterId, characterLabel, label: `${characterLabel} Cowboy Cool`, hatId: "cowboy", glassesId: "gold_aviator", source: path.join(sourceDir, `${sourcePrefix}-cowboy-glasses.png`) },
  ];
}

for (const variant of variants) {
  const renderName = variant.renderName ?? `${variant.id}_static_v1.webp`;
  const outputPath = path.join(renderDir, renderName);
  await sharp(variant.source)
    .resize(1024, 1024, { fit: "contain", background: "transparent" })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath);
  variant.image = `/assets/avatar-catalog/cow-v1/renders/${renderName}`;
  variant.sha256 = createHash("sha256").update(await readFile(outputPath)).digest("hex");
  delete variant.source;
  delete variant.renderName;
}

await writeFile(
  path.join(catalogDir, "manifest.json"),
  `${JSON.stringify({ catalogId: "cow-v1", version: 2, variants }, null, 2)}\n`,
);

console.log(`Optimized ${variants.length} approved static avatar renders in ${renderDir}`);
