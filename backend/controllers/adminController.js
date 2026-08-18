const IshiharaImage = require('../models/IshiharaImage');
const User = require('../models/User');
const TestResult = require('../models/TestResult');
const TestSession = require('../models/TestSession');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString } = require('../utils/validators');
const config = require('../config/testConfig');

// GET /api/admin/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalTests, avgAccuracyAgg, screeningDistribution] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    TestResult.countDocuments(),
    TestResult.aggregate([{ $group: { _id: null, avg: { $avg: '$overallAccuracy' } } }]),
    TestResult.aggregate([{ $group: { _id: '$screeningStatus', count: { $sum: 1 } } }]),
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const testsToday = await TestResult.countDocuments({ completedAt: { $gte: startOfDay } });

  const testsOverTime = await TestResult.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  const accuracyBuckets = await TestResult.aggregate([
    {
      $bucket: {
        groupBy: '$overallAccuracy',
        boundaries: [0, 0.25, 0.5, 0.75, 1.01],
        default: 'other',
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  res.json({
    totalUsers,
    totalTests,
    testsToday,
    averageAccuracy: avgAccuracyAgg[0]?.avg || 0,
    screeningDistribution,
    testsOverTime,
    accuracyBuckets,
  });
});

// GET /api/admin/images
const listImages = asyncHandler(async (req, res) => {
  const { search, category, plateType, active } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { plateId: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { imageSource: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.category = category;
  if (plateType) query.plateType = plateType;
  if (active === 'true') query.active = true;
  if (active === 'false') query.active = false;

  const images = await IshiharaImage.find(query).sort({ plateNumber: 1 });
  res.json({ images, availableCategories: config.CATEGORIES, availablePlateTypes: config.PLATE_TYPES });
});

// POST /api/admin/images
// Note: metadata (plateNumber, plateType, expected responses) is normally
// seeded from backend/dataset/manifest.json (see DATASET_LICENSE.md). This
// endpoint exists mainly to let an admin attach/replace an image + its
// provenance on an existing plate record, or add a genuinely new plate.
const createImage = asyncHandler(async (req, res) => {
  const {
    plateId, plateNumber, plateType, category,
    imageUrl, imageSource, imageSourceUrl, imageLicense, imageVerified,
    normalVisionResponse, redGreenDeficientResponse, totalColorBlindResponse,
    protanResponse, deutanResponse, notes, purpose, active,
  } = req.body;

  if (!isNonEmptyString(plateId, 100) || !plateNumber || !isNonEmptyString(plateType, 50) ||
      !isNonEmptyString(category, 50)) {
    return res.status(400).json({ message: 'plateId, plateNumber, plateType, and category are required.' });
  }
  if (active && (!imageUrl || !imageVerified)) {
    return res.status(400).json({
      message: 'A plate cannot be created as active without both imageUrl and imageVerified=true. ' +
        'See DATASET_LICENSE.md.',
    });
  }

  const image = await IshiharaImage.create({
    plateId: plateId.trim(),
    plateNumber,
    plateType,
    category: category.trim(),
    imageUrl: imageUrl?.trim() || null,
    imageSource: imageSource?.trim() || null,
    imageSourceUrl: imageSourceUrl?.trim() || null,
    imageLicense: imageLicense?.trim() || null,
    imageVerified: !!imageVerified,
    normalVisionResponse: normalVisionResponse ?? null,
    redGreenDeficientResponse: redGreenDeficientResponse ?? null,
    totalColorBlindResponse: totalColorBlindResponse ?? null,
    protanResponse: protanResponse ?? null,
    deutanResponse: deutanResponse ?? null,
    notes: notes ?? null,
    purpose: purpose ?? null,
    active: !!active,
  });

  res.status(201).json({ image });
});

// PUT /api/admin/images/:id
const updateImage = asyncHandler(async (req, res) => {
  const {
    plateId, plateNumber, plateType, category,
    imageUrl, imageSource, imageSourceUrl, imageLicense, imageVerified,
    normalVisionResponse, redGreenDeficientResponse, totalColorBlindResponse,
    protanResponse, deutanResponse, notes, purpose, active,
  } = req.body;

  const image = await IshiharaImage.findById(req.params.id);
  if (!image) return res.status(404).json({ message: 'Image not found.' });

  if (plateId !== undefined) image.plateId = plateId.trim();
  if (plateNumber !== undefined) image.plateNumber = plateNumber;
  if (plateType !== undefined) image.plateType = plateType;
  if (category !== undefined) image.category = category.trim();
  if (imageUrl !== undefined) image.imageUrl = imageUrl?.trim() || null;
  if (imageSource !== undefined) image.imageSource = imageSource?.trim() || null;
  if (imageSourceUrl !== undefined) image.imageSourceUrl = imageSourceUrl?.trim() || null;
  if (imageLicense !== undefined) image.imageLicense = imageLicense?.trim() || null;
  if (imageVerified !== undefined) image.imageVerified = !!imageVerified;
  if (normalVisionResponse !== undefined) image.normalVisionResponse = normalVisionResponse;
  if (redGreenDeficientResponse !== undefined) image.redGreenDeficientResponse = redGreenDeficientResponse;
  if (totalColorBlindResponse !== undefined) image.totalColorBlindResponse = totalColorBlindResponse;
  if (protanResponse !== undefined) image.protanResponse = protanResponse;
  if (deutanResponse !== undefined) image.deutanResponse = deutanResponse;
  if (notes !== undefined) image.notes = notes;
  if (purpose !== undefined) image.purpose = purpose;
  if (active !== undefined) image.active = !!active; // model pre-validate hook enforces imageUrl+imageVerified

  await image.save();
  res.json({ image });
});

// DELETE /api/admin/images/:id
const deleteImage = asyncHandler(async (req, res) => {
  const image = await IshiharaImage.findByIdAndDelete(req.params.id);
  if (!image) return res.status(404).json({ message: 'Image not found.' });
  res.json({ message: 'Image deleted.' });
});

// POST /api/admin/images/upload  (multipart file upload -> returns imageUrl)
const uploadImageFile = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
});

module.exports = { getDashboard, listImages, createImage, updateImage, deleteImage, uploadImageFile };