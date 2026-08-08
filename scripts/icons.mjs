import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))

for (const size of [180, 192, 512]) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(new URL(`../public/icon-${size}.png`, import.meta.url).pathname.replace(/^\//, ''))
  console.log('wrote', `public/icon-${size}.png`)
}
