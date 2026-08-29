import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [16, 32, 48, 96, 128];
const inputSvg = path.join(__dirname, '..', 'public', 'icon', 'vector.svg');

await Promise.all(
  sizes.map((size) =>
    sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, '..', 'public', 'icon', `${size}.png`)),
  ),
);

console.log('done');
