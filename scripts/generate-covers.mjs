import sharp from "sharp";

async function cover(path, c1, c2, title) {
  const svg = Buffer.from(`<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <circle cx="220" cy="180" r="70" fill="rgba(255,255,255,0.35)"/>
    <circle cx="980" cy="700" r="110" fill="rgba(255,255,255,0.2)"/>
    <text x="600" y="470" text-anchor="middle" font-size="84" font-family="Arial" fill="white" font-weight="700">${title}</text>
  </svg>`);
  await sharp(svg).webp({ quality: 80 }).toFile(path);
}

await cover("examples/memory-card/cover.webp", "#fb7185", "#fdba74", "记忆翻翻乐");
await cover("examples/catch-stars/cover.webp", "#2dd4bf", "#60a5fa", "接住小星星");
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 232, g: 93, b: 76, alpha: 1 },
  },
}).png().toFile("examples/memory-card/icon.png");
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 15, g: 118, b: 110, alpha: 1 },
  },
}).png().toFile("examples/catch-stars/icon.png");
console.log("covers ok");
