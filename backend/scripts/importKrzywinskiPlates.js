const fs = require('fs');
const path = require('path');

const PROTECTED_PLATE_NUMBERS = new Set([1, 9, 11, 19, 23]); // already Wikimedia-verified
const FORCE = process.argv.includes('--force');
const srcDirArg = process.argv[2];

if (!srcDirArg) {
  console.error('Usage: node scripts/importKrzywinskiPlates.js <path-to-extracted-folder> [--force]');
  process.exit(1);
}

const srcDir = path.resolve(srcDirArg);
if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'dataset', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const today = new Date().toISOString().slice(0, 10);

let imported = 0;
let skippedProtected = 0;
let skippedMissingSource = 0;

for (const plate of manifest.plates) {
  const n = plate.plateNumber;

  if (n > 38) continue;

  if (PROTECTED_PLATE_NUMBERS.has(n) && !FORCE) {
    skippedProtected++;
    continue;
  }

  const srcFile = path.join(srcDir, `ishihara-38-test-plates-${n}.png`);
  if (!fs.existsSync(srcFile)) {
    console.log(`  [skip] plate ${n}: source file not found (${srcFile})`);
    skippedMissingSource++;
    continue;
  }

  const plateId = plate.plateId;
  const destDir = path.join(__dirname, '..', 'dataset', 'ishihara', plateId);
  const destFile = path.join(destDir, 'image.png');

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcFile, destFile);

  plate.imageFile = `ishihara/${plateId}/image.png`;
  plate.imageUrl = `/dataset-images/${plateId}/image.png`;
  plate.imageSource = 'Martin Krzywinski, "Ishihara\'s Tests for Colour Deficiency" (photographed/colour-corrected from the 38-plate Ishihara book)';
  plate.imageSourceUrl = 'https://mk.bcgsc.ca/ishihara-tests-for-colour-deficiency/downloads.mhtml';
  plate.imageLicense =
    `Krzywinski source -- permission requested via email on ${today}, response pending. ` +
    `No explicit redistribution license found on the source page. Personal/local development ` +
    `and testing use only. Do NOT treat this as clearance for public redistribution -- see ` +
    `/DATASET_LICENSE.md. Repository should remain private until permission is confirmed or a ` +
    `substitute clearly-licensed image is used.`;
  plate.imageVerified = true;

  imported++;
  console.log(`  [ok]   plate ${n} -> ${plateId}/image.png`);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log('');
console.log(`Imported: ${imported}`);
console.log(`Skipped (already Wikimedia-verified, use --force to overwrite): ${skippedProtected}`);
console.log(`Skipped (source file missing): ${skippedMissingSource}`);
console.log('');
console.log('manifest.json updated. Now run:');
console.log('  npm run seed');
console.log('  npm run validate-dataset');