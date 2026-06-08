import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['public', 'dist'];

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <circle cx="980" cy="120" r="180" fill="#10B981" fill-opacity="0.12"/>
  <circle cx="220" cy="520" r="220" fill="#3B82F6" fill-opacity="0.1"/>
  <text x="96" y="250" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700">JustRouter</text>
  <text x="96" y="340" fill="#d1d5db" font-family="Inter, Arial, sans-serif" font-size="36">Единый AI-сервис: текст, фото, видео, аудио</text>
  <text x="96" y="420" fill="#9ca3af" font-family="Inter, Arial, sans-serif" font-size="28">GPT · Claude · Gemini · Flux · Veo · API для разработчиков</text>
  <text x="96" y="560" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="24">justrouter.ru</text>
</svg>`;

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[og-image] sharp not installed — run npm install -D sharp');
  process.exit(0);
}

for (const dir of targets) {
  const outDir = join(root, dir);
  try {
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(outDir, 'og-image.png'));
    await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(join(outDir, 'og-image.webp'));
    console.log(`[og-image] wrote ${dir}/og-image.png and .webp`);
  } catch (e) {
    if (dir === 'dist') console.warn(`[og-image] skip ${dir}:`, e.message);
  }
}

writeFileSync(join(root, 'public', 'og-image.svg'), svg, 'utf8');
