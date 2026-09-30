import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
await mkdir(`${publicDir}icons`, { recursive: true });
const source = `${publicDir}logos/logo-black.webp`;
// Isolate the symbol above the lettering to fill the tiny browser tab icon.
const cropped = await sharp(source)
  .extract({ left: 460, top: 160, width: 655, height: 545 }).png().toBuffer();
const symbol = await sharp(cropped).trim({ background: '#00000000', threshold: 10 }).png().toBuffer();
for (const size of [16, 32, 48]) {
  await sharp(symbol).resize(size - 2, size - 2, { fit: 'contain', background: '#00000000' })
    .extend({ top: 1, bottom: 1, left: 1, right: 1, background: '#00000000' })
    .png({ compressionLevel: 9 })
    .toFile(`${publicDir}icons/corteo-favicon-${size}.png`);
}
// Standard multi-resolution ICO, also available at the browser's default /favicon.ico.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(size => readFile(`${publicDir}icons/corteo-favicon-${size}.png`)));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, i) => {
  const entry = 6 + i * 16;
  directory[entry] = directory[entry + 1] = sizes[i];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(`${publicDir}favicon.ico`, Buffer.concat([directory, ...frames]));
// Full wordmark for installation, with a safe area for maskable icons.
const logo = await sharp(source).trim({ background: '#00000000', threshold: 10 }).png().toBuffer();
for (const size of [192, 512]) {
  for (const maskable of [false, true]) {
    const padding = Math.ceil(size * (maskable ? 0.16 : 0.06));
    await sharp(logo).resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: '#202020' })
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#202020' })
      .flatten({ background: '#202020' }).png({ compressionLevel: 9 })
      .toFile(`${publicDir}icons/corteo-${size}${maskable ? '-maskable' : ''}.png`);
  }
}
console.log('CORTEO favicons and installation icons generated from logo-black.webp.');
