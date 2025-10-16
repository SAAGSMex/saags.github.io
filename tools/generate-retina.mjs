import sharp from 'sharp';
import { promises as fs } from 'fs';

const src = 'img/background/milkyway_bg_mobile.webp';
const out2x = 'img/background/milkyway_bg_mobile@2x.webp';
const out3x = 'img/background/milkyway_bg_mobile@3x.webp';

async function main() {
  try {
    // ensure source exists
    await fs.access(src);
    const image = sharp(src);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) throw new Error('Cannot read image dimensions');

    // Note: this upscales. Better to use a higher-res original if available.
    const w = meta.width;
    const h = meta.height;

    // 2x
    await sharp(src)
      .resize({ width: Math.round(w * 2), height: Math.round(h * 2), fit: 'cover' })
      .webp({ quality: 82, effort: 4 })
      .toFile(out2x);

    // 3x
    await sharp(src)
      .resize({ width: Math.round(w * 3), height: Math.round(h * 3), fit: 'cover' })
      .webp({ quality: 78, effort: 4 })
      .toFile(out3x);

    console.log('Generated:', out2x, out3x);
  } catch (err) {
    console.error('Failed to generate retina variants:', err.message);
    process.exit(1);
  }
}

main();
