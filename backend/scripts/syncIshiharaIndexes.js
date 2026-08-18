/**
 * Syncs the ishiharaimages collection's indexes to exactly match the
 * current IshiharaImage schema. This drops leftover indexes from the OLD
 * schema (e.g. the old unique index on `imageId`, which no longer exists
 * as a field) that survive even after the legacy documents themselves are
 * deleted -- indexes are independent of documents in MongoDB.
 *
 * Safe to run any time; it only touches index metadata, never data.
 *
 * Usage:
 *   node scripts/syncIshiharaIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const IshiharaImage = require('../models/IshiharaImage');

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Refusing to run without a target database.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${process.env.MONGO_URI}\n`);

  const before = await mongoose.connection.db.collection('ishiharaimages').indexes();
  console.log('Indexes before sync:');
  for (const idx of before) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

  const dropped = await IshiharaImage.syncIndexes();
  console.log(`\nsyncIndexes() dropped/adjusted: ${JSON.stringify(dropped)}`);

  const after = await mongoose.connection.db.collection('ishiharaimages').indexes();
  console.log('\nIndexes after sync:');
  for (const idx of after) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Index sync failed:', err.message);
  process.exit(1);
});