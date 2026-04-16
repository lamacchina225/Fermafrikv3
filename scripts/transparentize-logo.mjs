import sharp from "sharp";
import { rename } from "node:fs/promises";

const SRC = "public/logo.png";
const TMP = "public/logo.tmp.png";
const WHITE_THRESHOLD = 235;
const SOFT_EDGE_RANGE = 25;

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const pixelCount = width * height;
const visited = new Uint8Array(pixelCount);

function whiteness(idx) {
  return Math.min(data[idx], data[idx + 1], data[idx + 2]);
}

const stack = [];
for (let y = 0; y < height; y++) {
  stack.push(y * width);
  stack.push(y * width + width - 1);
}
for (let x = 0; x < width; x++) {
  stack.push(x);
  stack.push(x + (height - 1) * width);
}

let cleared = 0;
while (stack.length) {
  const p = stack.pop();
  if (visited[p]) continue;
  const idx = p * 4;
  const w = whiteness(idx);
  if (w < WHITE_THRESHOLD - SOFT_EDGE_RANGE) continue;

  visited[p] = 1;

  if (w >= WHITE_THRESHOLD) {
    data[idx + 3] = 0;
    cleared++;
  } else {
    const ramp = (w - (WHITE_THRESHOLD - SOFT_EDGE_RANGE)) / SOFT_EDGE_RANGE;
    data[idx + 3] = Math.round(255 * (1 - ramp));
  }

  const x = p % width;
  const y = (p - x) / width;
  if (x > 0) stack.push(p - 1);
  if (x < width - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - width);
  if (y < height - 1) stack.push(p + width);
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(TMP);
await rename(TMP, SRC);
console.log(`cleared ${cleared} / ${pixelCount} pixels → ${SRC}`);
