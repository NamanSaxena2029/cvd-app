const TestSession = require('../models/TestSession');
const TestAnswer = require('../models/TestAnswer');
const TestResult = require('../models/TestResult');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeScreening } = require('../services/screeningService');
const { isSessionOwnedBy } = require('../services/testSessionService');
const { generateReportPdf } = require('../services/pdfReportService');

// POST /api/test/:sessionId/complete
const completeTest = asyncHandler(async (req, res) => {
  const session = await TestSession.findOne({ sessionId: req.params.sessionId });
  if (!session) return res.status(404).json({ message: 'Test session not found.' });

  const guestToken = req.headers['x-guest-token'] || null;
  const owned = await isSessionOwnedBy(session, req.user, guestToken);
  if (!owned) return res.status(403).json({ message: 'Not authorized for this test session.' });

  // Idempotent: if a result already exists, just return it
  const existing = await TestResult.findOne({ session: session._id });
  if (existing) {
    return res.json({ result: existing });
  }

  if (session.status !== 'completed') {
    return res.status(409).json({ message: 'Test is not yet complete.' });
  }

  const answers = await TestAnswer.find({ session: session._id }).lean();
  if (answers.length === 0) {
    return res.status(409).json({ message: 'No answers recorded for this session.' });
  }

  const analysis = analyzeScreening(answers);

  const result = await TestResult.create({
    session: session._id,
    user: session.user || null,
    guestToken: session.guestToken || null,
    ...analysis,
  });

  res.status(201).json({ result });
});

// GET /api/results/:id
const getResult = asyncHandler(async (req, res) => {
  const result = await TestResult.findById(req.params.id);
  if (!result) return res.status(404).json({ message: 'Result not found.' });

  const guestToken = req.headers['x-guest-token'] || null;
  const owned =
    (req.user && result.user && String(result.user) === String(req.user._id)) ||
    (result.guestToken && guestToken && result.guestToken === guestToken);

  if (!owned) return res.status(403).json({ message: 'Not authorized to view this result.' });

  res.json({ result });
});

// GET /api/results/history  (logged in users only)
const getHistory = asyncHandler(async (req, res) => {
  const results = await TestResult.find({ user: req.user._id }).sort({ completedAt: -1 });
  res.json({ results });
});

// GET /api/results/:id/report  -> streams a PDF
const downloadReport = asyncHandler(async (req, res) => {
  const result = await TestResult.findById(req.params.id).populate('user', 'name email');
  if (!result) return res.status(404).json({ message: 'Result not found.' });

  const guestToken = req.headers['x-guest-token'] || null;
  const owned =
    (req.user && result.user && String(result.user._id) === String(req.user._id)) ||
    (result.guestToken && guestToken && result.guestToken === guestToken);

  if (!owned) return res.status(403).json({ message: 'Not authorized to view this result.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cvd-screening-report-${result._id}.pdf"`);

  generateReportPdf(result, req.user).pipe(res);
});

// GET /api/results/shared/:shareToken  (public, minimal info)
const getSharedResult = asyncHandler(async (req, res) => {
  const result = await TestResult.findOne({ shareToken: req.params.shareToken });
  if (!result) return res.status(404).json({ message: 'Shared result not found.' });

  res.json({
    result: {
      completedAt: result.completedAt,
      overallAccuracy: result.overallAccuracy,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      timeoutCount: result.timeoutCount,
      totalQuestions: result.totalQuestions,
      screeningStatus: result.screeningStatus,
      probableCategory: result.probableCategory,
      explanation: result.explanation,
      disclaimer: result.disclaimer,
      roundStats: result.roundStats,
    },
  });
});

module.exports = { completeTest, getResult, getHistory, downloadReport, getSharedResult };
