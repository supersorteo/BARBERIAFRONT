import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/logos/', import.meta.url));
// JPEG originals remain untouched. Preserve the original canvas and foreground RGB.
for (const variant of ['black', 'white']) {
  const source = `${root}logo-${variant}.jpeg`;
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    const rgb = [...data.subarray(p * 3, p * 3 + 3)];
    const max = Math.max(...rgb), min = Math.min(...rgb);
    // White background is neutral gray (247); gold highlights have warm chroma.
    const distance = variant === 'black' ? max : Math.max(max - min, ...rgb.map(v => Math.abs(v - 247)));
    const low = variant === 'black' ? 12 : 4;
    const high = variant === 'black' ? 40 : 15;
    const alpha = Math.max(0, Math.min(1, (distance - low) / (high - low)));
    for (let c = 0; c < 3; c++) rgba[p * 4 + c] = alpha === 0 ? 0 : rgb[c];
    rgba[p * 4 + 3] = Math.round(alpha * 255);
  }
  // Remove isolated JPEG ringing in the matte without filtering the gold texture.
  const raw = { width: info.width, height: info.height, channels: 4 };
  const matte = await sharp(rgba, { raw }).extractChannel(3).median(3).blur(0.4).raw().toBuffer();
  for (let p = 0; p < matte.length; p++) {
    rgba[p * 4 + 3] = matte[p] < 8 ? 0 : matte[p];
    if (!rgba[p * 4 + 3]) rgba.fill(0, p * 4, p * 4 + 3);
  }
  // PNG master preserves all extracted pixels; WebP is the lighter web delivery.
  await sharp(rgba, { raw }).png({ compressionLevel: 9 }).toFile(`${root}logo-${variant}.png`);
  const output = `${root}logo-${variant}.webp`;
  await sharp(rgba, { raw }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(output);
  console.log(variant, { before: (await stat(source)).size, after: (await stat(output)).size });
}
await sharp(`${root}logo-white.png`).resize(180, 180, { fit: 'contain', background: '#202020' })
  .flatten({ background: '#202020' }).png({ compressionLevel: 9 }).toFile(`${root}apple-touch-icon.png`);
