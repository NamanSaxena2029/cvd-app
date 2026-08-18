const TestSession = require('../models/TestSession');
const TestAnswer = require('../models/TestAnswer');
const TestResult = require('../models/TestResult');
const asyncHandler = require('../utils/asyncHandler');
const { scoreSession } = require('../services/ishiharaScoringService');
const { isSessionOwnedBy } = require('../services/testSessionService');
const { generateReportPdf } = require('../services/pdfReportService');

function buildExplanation(officialScreening) {
  const { status, presentedCount, fullOfficialSetSize, normalReadCount, subtype, note } = officialScreening;

  if (status === 'insufficient_data') {
    return `Not enough of the official numeral screening plates were presented to produce a ` +
      `screening result. ${note}`;
  }

  const base = `${normalReadCount} of ${presentedCount} numeral screening plates were read as a ` +
    `person with normal colour vision would read them. ${note}`;

  if (status === 'normal_range') {
    return `Preliminary screening indicates a normal-range result. ${base} No pattern consistent ` +
      `with colour vision deficiency was detected in this session. This is not a medical diagnosis.`;
  }
  if (status === 'borderline') {
    return `Preliminary screening result is borderline. ${base} This does not confirm a colour ` +
      `vision deficiency, but Ishihara's own manual notes this range is inconclusive and ` +
      `recommends further professional testing (e.g. an anomaloscope).`;
  }
  // deficient_range
  const subtypeText = subtype?.label
    ? ` The pattern of responses on the diagnostic plates is most consistent with a "${subtype.label}".`
    : '';
  return `Preliminary screening indicates a pattern consistent with possible red-green colour ` +
    `vision deficiency. ${base}${subtypeText} Professional testing is recommended for ` +
    `confirmation. This is not a medical diagnosis.`;
}

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

  const answers = await TestAnswer.find({ session: session._id })
    .populate('image') // the IshiharaImage/plate this answer was for
    .lean();
  if (answers.length === 0) {
    return res.status(409).json({ message: 'No answers recorded for this session.' });
  }

  const scoringInput = answers.map((a) => ({
    round: a.round,
    givenAnswer: a.givenAnswer,
    isSkipped: a.isSkipped,
    isTimeout: a.isTimeout,
    isCorrect: a.isCorrect,
    plate: a.image, // populated IshiharaImage doc
  }));

  const { officialScreening, projectExperiment, disclaimer } = scoreSession(scoringInput);

  const explanation = buildExplanation(officialScreening);

  const result = await TestResult.create({
    session: session._id,
    user: session.user || null,
    guestToken: session.guestToken || null,
    totalQuestions: projectExperiment.totalQuestions,
    correctCount: projectExperiment.correctCount,
    incorrectCount: projectExperiment.incorrectCount,
    timeoutCount: projectExperiment.timeoutCount,
    overallAccuracy: projectExperiment.overallAccuracy,
    roundStats: projectExperiment.roundStats,
    officialScreening,
    screeningStatus: officialScreening.status,
    explanation,
    disclaimer,
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
      officialScreening: result.officialScreening,
      explanation: result.explanation,
      disclaimer: result.disclaimer,
      roundStats: result.roundStats,
    },
  });
});

module.exports = { completeTest, getResult, getHistory, downloadReport, getSharedResult };