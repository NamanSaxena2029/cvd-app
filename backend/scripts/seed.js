require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const IshiharaImage = require('../models/IshiharaImage');
const User = require('../models/User');

const MANIFEST_PATH = path.join(__dirname, '..', 'dataset', 'manifest.json');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding...');

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Dataset manifest not found at ${MANIFEST_PATH}. Run this from backend/.`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  let inserted = 0;
  let skippedNoImage = 0;

  for (const p of manifest.plates) {
    const imageFilePath = path.join(__dirname, '..', 'dataset', p.imageFile);
    const hasImageOnDisk = fs.existsSync(imageFilePath);

    if (!hasImageOnDisk) skippedNoImage += 1;

    const doc = {
      plateId: p.plateId,
      plateNumber: p.plateNumber,
      plateType: p.plateType,
      category:
        p.plateType === 'demonstration'
          ? 'demonstration'
          : p.plateType === 'classification_tracing'
          ? 'classification_tracing'
          : 'red_green', // transformation/vanishing/hidden_digit/diagnostic all screen red-green
      normalVisionResponse: p.normalVisionResponse ?? null,
      redGreenDeficientResponse: p.redGreenDeficientResponse ?? null,
      totalColorBlindResponse: p.totalColorBlindResponse ?? null,
      protanResponse: p.protanResponse ?? null,
      deutanResponse: p.deutanResponse ?? null,
      notes: p.notes ?? null,
      // dataset/ishihara/plate-XX/image.png is served at /dataset-images/plate-XX/image.png
      imageUrl: hasImageOnDisk ? p.imageUrl || `/dataset-images/${p.plateId}/image.png` : null,
      imageSource: p.imageSource ?? null,
      imageSourceUrl: p.imageSourceUrl ?? null,
      imageLicense: p.imageLicense ?? null,
      imageVerified: !!p.imageVerified,
      // never force-activate on seed, even if metadata says active=true --
      // an admin must consciously activate a plate after checking it.
      active: false,
    };

    await IshiharaImage.findOneAndUpdate({ plateId: p.plateId }, doc, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    inserted += 1;
  }

  console.log(`Upserted metadata for ${inserted} plates.`);
  if (skippedNoImage > 0) {
    console.log(
      `\n${skippedNoImage} of ${inserted} plates have NO image file on disk yet and were seeded ` +
        `as inactive with imageUrl=null. See DATASET_LICENSE.md for how to add licensed images. ` +
        `The app requires ${'MIN_ACTIVE_IMAGES_REQUIRED'} active plates before a test can start.`
    );
  }

  const adminEmail = 'admin@cvd-app.local';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await User.hashPassword('Admin@123');
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });
    console.log(`Created default admin: ${adminEmail} / Admin@123 (CHANGE THIS PASSWORD)`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});