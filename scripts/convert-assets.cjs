// One-time asset conversion script for Phase 4 hardening.
// Compresses logo.png and converts wallpapers to WebP.
// Run with: node scripts/convert-assets.cjs
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');

// Per-file quality overrides for files that need extra compression
const qualityOverrides = { 'wp-3.jpg': 65, 'wp-4.jpg': 70 };

async function compressLogo() {
  const src = path.join(root, 'src', 'assets', 'logo.png');
  const tmp = src + '.tmp.png';
  await sharp(src)
    .png({ quality: 70, compressionLevel: 9, palette: true, colors: 128 })
    .toFile(tmp);
  fs.renameSync(tmp, src);
  const size = Math.round(fs.statSync(src).size / 1024);
  console.log(`logo.png: ${size} KB`);
}

async function convertWallpapers() {
  const dir = path.join(root, 'src', 'assets', 'wallpapers');
  fs.readdirSync(dir).filter(f => f.endsWith('.webp')).forEach(f => fs.unlinkSync(path.join(dir, f)));
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
  for (const file of files) {
    const src = path.join(dir, file);
    const dest = path.join(dir, file.replace('.jpg', '.webp'));
    const quality = qualityOverrides[file] ?? 78;
    await sharp(src).webp({ quality, smartSubsample: true }).toFile(dest);
    const size = Math.round(fs.statSync(dest).size / 1024);
    const ok = size < 300 ? '✓' : '!';
    console.log(`${ok} ${file.replace('.jpg', '.webp')}: ${size} KB`);
  }
}

(async () => {
  await compressLogo();
  await convertWallpapers();
  console.log('Done.');
})();
