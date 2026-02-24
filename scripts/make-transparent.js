/**
 * Makes green pixels in the meter frame image transparent.
 * Run: node scripts/make-transparent.js
 */
const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../assets/meter-frame-source.png');
const outputPath = path.join(__dirname, '../assets/meter-frame-overlay.png');

// Green color range to make transparent (vibrant light green)
// Using a threshold - pixels with green dominant and low blue/red become transparent
async function main() {
  const image = await sharp(inputPath);
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Green segments: make transparent (g dominant, bright)
    const isGreen = g > 100 && g > r && g > b && (r + b) < g * 1.5;
    // Yellow background: make transparent (r and g high, low b)
    const isYellow = r > 200 && g > 200 && b < 150;
    if (isGreen || isYellow) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  console.log('Created', outputPath);
}

main().catch(console.error);
