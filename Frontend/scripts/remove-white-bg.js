const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

async function processImage(inputName, outputName, threshold = 240, feather = 20) {
  const assetsDir = path.join(__dirname, "../public/assets");
  const inputPath = path.join(assetsDir, inputName);
  const outputPath = path.join(assetsDir, outputName);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    return;
  }

  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  // channels is 4 (RGBA)

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is white/near-white
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const isGrayish = maxVal - minVal < 25; // close to neutral white/gray

    if (minVal >= threshold && isGrayish) {
      // Fully transparent
      data[i + 3] = 0;
    } else if (minVal > threshold - feather && isGrayish) {
      // Feathered transparency edge
      const alphaFactor = 1 - (minVal - (threshold - feather)) / feather;
      data[i + 3] = Math.round(data[i + 3] * alphaFactor);
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`Saved transparent image: ${outputName}`);
}

async function main() {
  await processImage("golden glasses.png", "glasses_transparent.png", 242, 20);
  await processImage("mustache.png", "mustache_transparent.png", 245, 18);
  await processImage("Golden_crown.png", "crown_transparent.png", 245, 20);
}

main().catch(console.error);
