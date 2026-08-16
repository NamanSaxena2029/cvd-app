/**
 * Seed script.
 *
 * IMPORTANT: This inserts sample/placeholder Ishihara-style plate metadata
 * ONLY. It does NOT include real, copyrighted Ishihara plate artwork.
 * Replace `imageUrl` values with your own properly licensed plate images
 * placed in backend/uploads/ (or a cloud bucket) before using this app
 * for any real screening purpose.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const IshiharaImage = require('../models/IshiharaImage');
const User = require('../models/User');

const SAMPLE_PLATES = [
  { imageId: 'plate_001', imageUrl: '/uploads/sample/plate_001.png', correctAnswer: '12', category: 'normal' },
  { imageId: 'plate_002', imageUrl: '/uploads/sample/plate_002.png', correctAnswer: '8', category: 'normal' },
  { imageId: 'plate_003', imageUrl: '/uploads/sample/plate_003.png', correctAnswer: '29', category: 'normal' },
  { imageId: 'plate_004', imageUrl: '/uploads/sample/plate_004.png', correctAnswer: '5', category: 'normal' },
  { imageId: 'plate_005', imageUrl: '/uploads/sample/plate_005.png', correctAnswer: '3', category: 'red_green' },
  { imageId: 'plate_006', imageUrl: '/uploads/sample/plate_006.png', correctAnswer: '15', category: 'red_green' },
  { imageId: 'plate_007', imageUrl: '/uploads/sample/plate_007.png', correctAnswer: '74', category: 'red_green' },
  { imageId: 'plate_008', imageUrl: '/uploads/sample/plate_008.png', correctAnswer: '6', category: 'blue_yellow' },
  { imageId: 'plate_009', imageUrl: '/uploads/sample/plate_009.png', correctAnswer: '45', category: 'blue_yellow' },
  { imageId: 'plate_010', imageUrl: '/uploads/sample/plate_010.png', correctAnswer: '7', category: 'normal' },
  { imageId: 'plate_011', imageUrl: '/uploads/sample/plate_011.png', correctAnswer: '16', category: 'red_green' },
  { imageId: 'plate_012', imageUrl: '/uploads/sample/plate_012.png', correctAnswer: '42', category: 'normal' },
  { imageId: 'plate_013', imageUrl: '/uploads/sample/plate_013.png', correctAnswer: '96', category: 'total' },
  { imageId: 'plate_014', imageUrl: '/uploads/sample/plate_014.png', correctAnswer: '2', category: 'blue_yellow' },
  { imageId: 'plate_015', imageUrl: '/uploads/sample/plate_015.png', correctAnswer: '35', category: 'normal' },
].map((p) => ({ ...p, difficulty: 'medium', active: true, isSample: true }));

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding...');

  await IshiharaImage.deleteMany({ isSample: true });
  await IshiharaImage.insertMany(SAMPLE_PLATES);
  console.log(`Inserted ${SAMPLE_PLATES.length} sample plates.`);

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
  console.error('Seed failed:', err);
  process.exit(1);
});
