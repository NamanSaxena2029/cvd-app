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
  const { search, category, active } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { imageId: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.category = category;
  if (active === 'true') query.active = true;
  if (active === 'false') query.active = false;

  const images = await IshiharaImage.find(query).sort({ createdAt: -1 });
  res.json({ images, availableCategories: config.CATEGORIES });
});

// POST /api/admin/images
const createImage = asyncHandler(async (req, res) => {
  const { imageId, imageUrl, correctAnswer, category, difficulty, active } = req.body;

  if (!isNonEmptyString(imageId, 100) || !isNonEmptyString(imageUrl, 500) ||
      !isNonEmptyString(correctAnswer, 50) || !isNonEmptyString(category, 50)) {
    return res.status(400).json({ message: 'imageId, imageUrl, correctAnswer, and category are required.' });
  }

  const image = await IshiharaImage.create({
    imageId: imageId.trim(),
    imageUrl: imageUrl.trim(),
    correctAnswer: correctAnswer.trim(),
    category: category.trim(),
    difficulty: difficulty || 'medium',
    active: active !== undefined ? !!active : true,
  });

  res.status(201).json({ image });
});

// PUT /api/admin/images/:id
const updateImage = asyncHandler(async (req, res) => {
  const { imageId, imageUrl, correctAnswer, category, difficulty, active } = req.body;

  const image = await IshiharaImage.findById(req.params.id);
  if (!image) return res.status(404).json({ message: 'Image not found.' });

  if (imageId !== undefined) image.imageId = imageId.trim();
  if (imageUrl !== undefined) image.imageUrl = imageUrl.trim();
  if (correctAnswer !== undefined) image.correctAnswer = correctAnswer.trim();
  if (category !== undefined) image.category = category.trim();
  if (difficulty !== undefined) image.difficulty = difficulty;
  if (active !== undefined) image.active = !!active;

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
