/**
 * One-time cleanup: remove leftover documents from the OLD IshiharaImage
 * schema (pre-Ishihara-rebuild). MongoDB is schemaless, so swapping the
 * Mongoose model definition (imageId -> plateId, added plateNumber, changed
 * `active` default from true to false) did NOT touch rows already sitting
 * in the `ishiharaimages` collection. Those old rows -- the original app's
 * fake/placeholder plates (imageId, correctAnswer, active:true, isSample) --
 * are still there, and the new model reads them back with plateId/plateNumber
 * as undefined because those fields never existed on them.
 *
 * This script:
 *   1. Reads the RAW collection (bypassing the Mongoose schema/cast layer,
 *      since the new schema would silently strip the old fields we need to
 *      identify legacy docs by).
 *   2. Classifies every document as "legacy" (missing plateId or
 *      plateNumber -- the two fields every valid post-migration doc must
 *      have, per the model's `required: true`) or "current".
 *   3. Prints exactly what it found and what it *would* delete.
 *   4. Only deletes on an explicit --confirm flag. Dry-run by default.
 *   5. Touches ONLY the ishiharaimages collection. Never touches users,
 *      testsessions, testanswers, testresults, or any other collection.
 *
 * Usage:
 *   node scripts/migrateLegacyIshiharaData.js            # dry run (default)
 *   node scripts/migrateLegacyIshiharaData.js --confirm   # actually deletes
 */
require('dotenv').config();
const mongoose = require('mongoose');

const CONFIRM = process.argv.includes('--confirm');

function isLegacy(doc) {
  // A valid post-migration doc always has both plateId and plateNumber
  // (both `required: true` on the current schema). Anything missing either
  // one predates the migration and cannot be a legitimate current record.
  return (
    doc.plateId === undefined ||
    doc.plateId === null ||
    doc.plateNumber === undefined ||
    doc.plateNumber === null
  );
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Refusing to run without a target database.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${process.env.MONGO_URI}\n`);

  // Deliberately go through the raw driver collection, NOT the Mongoose
  // model, so we see every field exactly as stored -- including old fields
  // (imageId, correctAnswer, isSample) that the current schema doesn't
  // declare and would otherwise hide from us.
  const collection = mongoose.connection.db.collection('ishiharaimages');

  const allDocs = await collection.find({}).toArray();
  console.log(`Found ${allDocs.length} total document(s) in ishiharaimages.\n`);

  const legacy = allDocs.filter(isLegacy);
  const current = allDocs.filter((d) => !isLegacy(d));

  console.log(`  ${current.length} current-schema document(s) (has plateId + plateNumber) -- left untouched`);
  console.log(`  ${legacy.length} legacy document(s) (missing plateId and/or plateNumber) -- candidates for removal\n`);

  if (legacy.length > 0) {
    console.log('Legacy documents:');
    for (const doc of legacy) {
      console.log(
        `  _id=${doc._id}  imageId=${doc.imageId ?? '(none)'}  ` +
        `plateId=${doc.plateId ?? '(none)'}  plateNumber=${doc.plateNumber ?? '(none)'}  ` +
        `active=${doc.active}  isSample=${doc.isSample ?? '(none)'}  ` +
        `correctAnswer=${doc.correctAnswer ?? '(none)'}`
      );
    }
    console.log('');
  }

  if (legacy.length === 0) {
    console.log('Nothing to migrate. No legacy documents found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!CONFIRM) {
    console.log(
      `Dry run only -- no documents were deleted. Re-run with --confirm to permanently ` +
      `remove the ${legacy.length} legacy document(s) listed above from ishiharaimages.\n` +
      `No other collection (users, testsessions, testanswers, testresults, etc.) is touched by this script.`
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  const legacyIds = legacy.map((d) => d._id);
  const result = await collection.deleteMany({ _id: { $in: legacyIds } });
  console.log(`Deleted ${result.deletedCount} legacy document(s) from ishiharaimages.`);

  const remaining = await collection.countDocuments({});
  console.log(`${remaining} document(s) remain in ishiharaimages (should equal the current-schema count above).`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});