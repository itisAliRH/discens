import sharp from 'sharp';
import ico from 'sharp-ico';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'public', 'favicon.png');
const output = path.join(root, 'src', 'app', 'favicon.ico');

const image = sharp(input);
await ico.sharpsToIco([image], output, {
  sizes: [48, 32, 16],
  resizeOptions: {},
});
console.log('Generated', output);
