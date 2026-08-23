const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ASSETS_DIR = path.join(__dirname, "../public/assets");
const MASTER_DIR = path.join(ASSETS_DIR, "master");

if (!fs.existsSync(MASTER_DIR)) {
  fs.mkdirSync(MASTER_DIR, { recursive: true });
}

// Master Canvas Size
const CANVAS_SIZE = 1024;

/**
 * Creates a blank transparent 1024x1024 canvas buffer
 */
function createBlankCanvas() {
  return sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
}

async function generateMasterBaseBull() {
  const inputPath = path.join(ASSETS_DIR, "Simple Avatar no background.png");
  const outputPath = path.join(MASTER_DIR, "base_bull_1024.png");

  // Get original metadata to crop out the side line artifacts
  const meta = await sharp(inputPath).metadata();
  const cropLeft = 25;
  const cropTop = 0;
  const cropWidth = meta.width - 50;
  const cropHeight = meta.height;

  const bullWidth = 760;
  const bullHeight = 840;
  const left = Math.round((CANVAS_SIZE - bullWidth) / 2);
  const top = 184; // 18% top headroom

  const croppedBull = await sharp(inputPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(bullWidth, bullHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await createBlankCanvas()
    .composite([{ input: croppedBull, top, left }])
    .png()
    .toFile(outputPath);

  console.log("✓ Cleaned & Generated master/base_bull_1024.png (side lines cropped, 18% top headroom)");
}

async function generateMasterCrown() {
  const inputPath = path.join(ASSETS_DIR, "crown_transparent.png");
  const outputPath = path.join(MASTER_DIR, "crown_1024.png");

  const crownWidth = 360;
  const crownHeight = 225;
  const left = Math.round((CANVAS_SIZE - crownWidth) / 2);
  const top = 35;

  const resizedCrown = await sharp(inputPath)
    .resize(crownWidth, crownHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // 100% transparent padding
    })
    .toBuffer();

  await createBlankCanvas()
    .composite([{ input: resizedCrown, top, left }])
    .png()
    .toFile(outputPath);

  console.log("✓ Cleaned & Generated master/crown_1024.png (100% transparent alpha)");
}

async function generateMasterGlasses() {
  const inputPath = path.join(ASSETS_DIR, "glasses_transparent.png");
  const outputPath = path.join(MASTER_DIR, "glasses_1024.png");

  const glassesWidth = 410;
  const glassesHeight = 195;
  const left = Math.round((CANVAS_SIZE - glassesWidth) / 2);
  const top = 350;

  const resizedGlasses = await sharp(inputPath)
    .resize(glassesWidth, glassesHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // 100% transparent padding
    })
    .toBuffer();

  await createBlankCanvas()
    .composite([{ input: resizedGlasses, top, left }])
    .png()
    .toFile(outputPath);

  console.log("✓ Cleaned & Generated master/glasses_1024.png (100% transparent alpha)");
}

async function generateMasterMustache() {
  const inputPath = path.join(ASSETS_DIR, "mustache_transparent.png");
  const outputPath = path.join(MASTER_DIR, "mustache_1024.png");

  const mustacheWidth = 370;
  const mustacheHeight = 150;
  const left = Math.round((CANVAS_SIZE - mustacheWidth) / 2);
  const top = 470;

  const resizedMustache = await sharp(inputPath)
    .resize(mustacheWidth, mustacheHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // 100% transparent padding
    })
    .toBuffer();

  await createBlankCanvas()
    .composite([{ input: resizedMustache, top, left }])
    .png()
    .toFile(outputPath);

  console.log("✓ Cleaned & Generated master/mustache_1024.png (100% transparent alpha)");
}

async function generateMasterFrames() {
  const frames = [
    {
      name: "frame_mythic_gold_1024.png",
      borderColor: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.7)",
      accentColor: "#fbbf24",
    },
    {
      name: "frame_neon_glacier_1024.png",
      borderColor: "#22d3ee",
      glowColor: "rgba(34, 211, 238, 0.7)",
      accentColor: "#67e8f9",
    },
    {
      name: "frame_inferno_1024.png",
      borderColor: "#f43f5e",
      glowColor: "rgba(244, 63, 94, 0.7)",
      accentColor: "#fb7185",
    },
    {
      name: "frame_emerald_1024.png",
      borderColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.7)",
      accentColor: "#34d399",
    },
  ];

  for (const f of frames) {
    const outputPath = path.join(MASTER_DIR, f.name);
    const strokeWidth = 36;
    const radius = 128;

    const svg = `
      <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${f.accentColor}" />
            <stop offset="50%" stop-color="${f.borderColor}" />
            <stop offset="100%" stop-color="${f.accentColor}" />
          </linearGradient>
        </defs>
        <!-- Outer Border Glow -->
        <rect x="24" y="24" width="976" height="976" rx="${radius}" fill="none" stroke="${f.glowColor}" stroke-width="${strokeWidth * 1.6}" filter="url(#glow)" />
        <!-- Sharp Inner Metallic Frame -->
        <rect x="26" y="26" width="972" height="972" rx="${radius}" fill="none" stroke="url(#grad)" stroke-width="${strokeWidth}" />
        <!-- Inner Bevel Highlight -->
        <rect x="46" y="46" width="932" height="932" rx="${radius - 20}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4" />
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated master/${f.name}`);
  }
}

async function main() {
  console.log("🚀 Regenerating 1024x1024 Master Assets with 100% Transparent Alpha Padding...\n");
  await generateMasterBaseBull();
  await generateMasterCrown();
  await generateMasterGlasses();
  await generateMasterMustache();
  await generateMasterFrames();
  console.log("\n🎉 All Master Avatar Assets regenerated with 100% transparent alpha!");
}

main().catch(console.error);
