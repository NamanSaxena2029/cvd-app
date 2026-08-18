require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATASET_DIR = path.join(__dirname, '..', 'dataset');
const MANIFEST_PATH = path.join(DATASET_DIR, 'manifest.json');

const results = { errors: [], warnings: [], info: [] };
function ok(msg) { results.info.push(`\u2713 ${msg}`); }
function warn(msg) { results.warnings.push(`\u26a0 ${msg}`); }
function fail(msg) { results.errors.push(`\u2717 ${msg}`); }

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    fail(`Manifest not found at ${MANIFEST_PATH}`);
    return null;
  }
  ok(`Manifest file found at ${path.relative(process.cwd(), MANIFEST_PATH)}`);

  let raw;
  try {
    raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  } catch (err) {
    fail(`Could not read manifest.json: ${err.message}`);
    return null;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    fail(`manifest.json is not valid JSON: ${err.message}`);
    return null;
  }
  ok('manifest.json is valid JSON');

  if (!Array.isArray(manifest.plates)) {
    fail('manifest.json has no "plates" array.');
    return null;
  }

  return manifest;
}

function validatePlateMetadata(manifest) {
  const plates = manifest.plates;
  ok(`${plates.length} metadata records found`);

  if (!manifest.source || !manifest.sourceUrl) {
    warn('Manifest is missing top-level source/sourceUrl provenance fields.');
  } else {
    ok('Manifest has top-level source/sourceUrl provenance.');
  }
  if (!manifest.license) {
    warn('Manifest is missing a top-level license/permission statement.');
  } else {
    ok('Manifest has a top-level license/permission statement.');
  }

  const seenIds = new Set();
  const seenNumbers = new Set();
  const seenImageFiles = new Set();
  let duplicateIds = 0;
  let duplicateNumbers = 0;
  let duplicateFiles = 0;
  let missingRequiredFields = 0;
  let missingProvenance = 0;

  const REQUIRED_FIELDS = ['plateId', 'plateNumber', 'plateType', 'category', 'imageFile'];
  const NUMERAL_TYPES = ['transformation', 'vanishing', 'hidden_digit', 'diagnostic', 'demonstration'];

  for (const p of plates) {
    for (const field of REQUIRED_FIELDS) {
      if (p[field] === undefined || p[field] === null || p[field] === '') {
        fail(`Plate "${p.plateId || '(unknown id)'}" is missing required field "${field}".`);
        missingRequiredFields += 1;
      }
    }

    if (p.plateId) {
      if (seenIds.has(p.plateId)) {
        fail(`Duplicate plateId in manifest: "${p.plateId}"`);
        duplicateIds += 1;
      }
      seenIds.add(p.plateId);
    }

    if (p.plateNumber !== undefined) {
      if (seenNumbers.has(p.plateNumber)) {
        fail(`Duplicate plateNumber in manifest: ${p.plateNumber}`);
        duplicateNumbers += 1;
      }
      seenNumbers.add(p.plateNumber);
    }

    if (p.imageFile) {
      if (seenImageFiles.has(p.imageFile)) {
        fail(`Duplicate imageFile reference in manifest: "${p.imageFile}"`);
        duplicateFiles += 1;
      }
      seenImageFiles.add(p.imageFile);
    }

    // Response metadata is only "required" for plate types where a numeral
    // reading is the whole point of the plate; classification/tracing
    // plates legitimately have no numeral response.
    if (NUMERAL_TYPES.includes(p.plateType)) {
      const hasAnyResponse =
        p.normalVisionResponse || p.redGreenDeficientResponse || p.totalColorBlindResponse ||
        p.protanResponse || p.deutanResponse;
      if (!hasAnyResponse) {
        warn(`Plate "${p.plateId}" (type: ${p.plateType}) has no verified response metadata at all.`);
      }
    }

    if (!p.imageSource || !p.imageSourceUrl || p.imageLicense === undefined) {
      fail(`Plate "${p.plateId}" is missing provenance fields (imageSource/imageSourceUrl/imageLicense).`);
      missingProvenance += 1;
    }
  }

  if (duplicateIds === 0) ok('No duplicate plate IDs');
  if (duplicateNumbers === 0) ok('No duplicate plate numbers');
  if (duplicateFiles === 0) ok('No duplicate image file references');
  if (missingRequiredFields === 0) ok('All plates have required metadata fields');
  if (missingProvenance === 0) ok('All plates have source/license provenance recorded');

  return plates;
}

function validateImageFiles(plates) {
  let verifiedImageCount = 0;
  let missingImageCount = 0;
  let verifiedButMissingFile = 0;
  let brokenPaths = 0;
  const seenAbsolutePaths = new Set();
  let duplicateImageBytes = 0; // duplicate *paths* only; true byte-duplicate check would need hashing

  for (const p of plates) {
    const abs = path.join(DATASET_DIR, p.imageFile);
    const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();

    if (!exists) {
      missingImageCount += 1;
      if (p.imageVerified) {
        fail(`Plate "${p.plateId}" is marked imageVerified=true but no file exists at ${p.imageFile}`);
        verifiedButMissingFile += 1;
      }
      continue;
    }

    // Basic "can be loaded" check -- confirm it's non-empty and has an
    // image-like extension. (Full pixel decoding is intentionally out of
    // scope for this lightweight validator.)
    const stat = fs.statSync(abs);
    if (stat.size === 0) {
      fail(`Image file for "${p.plateId}" exists but is empty: ${p.imageFile}`);
      brokenPaths += 1;
      continue;
    }
    const ext = path.extname(abs).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) {
      warn(`Image file for "${p.plateId}" has an unexpected extension: ${ext}`);
    }

    if (seenAbsolutePaths.has(abs)) {
      fail(`Duplicate image file path resolved for multiple plates: ${abs}`);
      duplicateImageBytes += 1;
    }
    seenAbsolutePaths.add(abs);

    if (p.imageVerified) {
      verifiedImageCount += 1;
    } else {
      warn(`Plate "${p.plateId}" has an image file on disk but imageVerified=false -- ` +
        `it will not be usable until an admin confirms licensing and sets imageVerified=true.`);
    }
  }

  ok(`${verifiedImageCount} verified image files found (of ${plates.length} plates in manifest)`);

  if (verifiedImageCount === 0) {
    fail(
      'Dataset validation FAILED: real plate images are missing. 0 of ' +
      `${plates.length} plates have a verified image file on disk. See /DATASET_LICENSE.md for ` +
      'what is needed before real Ishihara plate images can be added, and each ' +
      'dataset/ishihara/plate-XX/README.txt for exactly where to place a file once it is licensed.'
    );
  } else if (verifiedImageCount < plates.length) {
    warn(`${plates.length - verifiedImageCount} plates still have no verified image file.`);
  }

  if (brokenPaths === 0) ok('No broken/unreadable image paths among files that do exist');

  return { verifiedImageCount, missingImageCount };
}

function findOrphanFiles(plates) {
  if (!fs.existsSync(path.join(DATASET_DIR, 'ishihara'))) return;
  const knownFiles = new Set(plates.map((p) => path.resolve(DATASET_DIR, p.imageFile)));

  const dirs = fs.readdirSync(path.join(DATASET_DIR, 'ishihara'), { withFileTypes: true })
    .filter((d) => d.isDirectory());

  let orphanCount = 0;
  for (const dir of dirs) {
    const dirPath = path.join(DATASET_DIR, 'ishihara', dir.name);
    const files = fs.readdirSync(dirPath).filter((f) => f !== 'README.txt');
    for (const f of files) {
      const abs = path.resolve(dirPath, f);
      if (!knownFiles.has(abs)) {
        warn(`Orphan file on disk with no matching manifest entry: dataset/ishihara/${dir.name}/${f}`);
        orphanCount += 1;
      }
    }
  }
  if (orphanCount === 0) ok('No orphan image files (files on disk with no manifest entry)');
}

async function validateDatabase(plates) {
  if (!process.env.MONGO_URI) {
    warn('MONGO_URI not set -- skipping database cross-check (manifest/file checks above still apply).');
    return;
  }

  let mongoose;
  try {
    mongoose = require('mongoose');
  } catch (err) {
    warn('mongoose not available -- skipping database cross-check.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    warn(`Could not connect to MongoDB (${err.message}) -- skipping database cross-check.`);
    return;
  }

  try {
    const IshiharaImage = require('../models/IshiharaImage');
    const manifestIds = new Set(plates.map((p) => p.plateId));

    const dbPlates = await IshiharaImage.find({}).lean();
    ok(`${dbPlates.length} plate records found in the database`);

    let orphanDbRecords = 0;
    let activeWithoutVerifiedImage = 0;

    for (const doc of dbPlates) {
      if (!manifestIds.has(doc.plateId)) {
        warn(`Database has plate "${doc.plateId}" with no corresponding manifest entry.`);
        orphanDbRecords += 1;
      }
      if (doc.active && (!doc.imageUrl || !doc.imageVerified)) {
        fail(`Database plate "${doc.plateId}" is active=true but lacks a verified image. This ` +
          `should be impossible (model pre-validate hook) -- investigate immediately.`);
        activeWithoutVerifiedImage += 1;
      }
    }
    if (orphanDbRecords === 0) ok('No orphan database plate records (all trace back to the manifest)');
    if (activeWithoutVerifiedImage === 0) ok('No active database plate exists without a verified image');

    const activeCount = dbPlates.filter((d) => d.active).length;
    const config = require('../config/testConfig');
    if (activeCount < config.MIN_ACTIVE_IMAGES_REQUIRED) {
      fail(
        `Only ${activeCount} active plates in the database (need at least ` +
        `${config.MIN_ACTIVE_IMAGES_REQUIRED} to start a test). Run "npm run seed" after adding ` +
        `licensed images, then activate plates from the admin panel.`
      );
    } else {
      ok(`${activeCount} active plates in the database (>= required minimum of ${config.MIN_ACTIVE_IMAGES_REQUIRED})`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  console.log('Ishihara Dataset Validation\n');

  const manifest = loadManifest();
  if (!manifest) {
    printSummaryAndExit();
    return;
  }

  const plates = validatePlateMetadata(manifest);
  validateImageFiles(plates);
  findOrphanFiles(plates);
  await validateDatabase(plates);

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(results.info.join('\n'));
  if (results.warnings.length) {
    console.log('\nWarnings:');
    console.log(results.warnings.join('\n'));
  }
  if (results.errors.length) {
    console.log('\nErrors:');
    console.log(results.errors.join('\n'));
  }

  console.log('');
  if (results.errors.length > 0) {
    console.log(`Dataset validation FAILED (${results.errors.length} error(s), ${results.warnings.length} warning(s)).`);
    process.exit(1);
  } else {
    console.log(`Dataset validation passed (${results.warnings.length} warning(s)).`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Validation script crashed:', err);
  process.exit(1);
});