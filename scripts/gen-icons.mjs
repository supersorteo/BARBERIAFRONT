import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');
const svg   = readFileSync(resolve(root, 'public/barber-icon.svg'));

mkdirSync(resolve(root, 'public/icons'), { recursive: true });

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const s of sizes) {
  await sharp(svg).resize(s, s).png().toFile(resolve(root, `public/icons/icon-${s}x${s}.png`));
  console.log(`✓ icon-${s}x${s}.png`);
}

// favicon 32 and 16 at root
await sharp(svg).resize(32, 32).png().toFile(resolve(root, 'public/favicon-32.png'));
await sharp(svg).resize(16, 16).png().toFile(resolve(root, 'public/favicon-16.png'));
console.log('✓ favicon-32.png  ✓ favicon-16.png');
console.log('Done.');
