const { v4: uuidv4 } = require('uuid');
const IshiharaImage = require('../models/IshiharaImage');
const TestSession = require('../models/TestSession');
const TestAnswer = require('../models/TestAnswer');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/testConfig');
const {
  TestError,
  pickPlatesForSession,
  isSessionOwnedBy,
} = require('../services/testSessionService');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function publicImage(image) {
  return {
    id: image._id,
    imageUrl: image.imageUrl,
    // correctAnswer & category are never sent to the client during the test
  };
}

// POST /api/test/start
const startTest = asyncHandler(async (req, res) => {
  const images = await pickPlatesForSession();
  const imageIds = images.map((i) => i._id);

  const guestToken = req.user ? null : uuidv4();

  const session = await TestSession.create({
    user: req.user ? req.user._id : null,
    guestToken,
    imageIds,
    currentRound: 1,
    currentQuestionIndex: 0,
    status: 'in_progress',
    currentQuestionServedAt: new Date(),
  });

  const firstImage = images[0];

  res.status(201).json({
    sessionId: session.sessionId,
    guestToken, // frontend must store this (localStorage) if not logged in
    totalRounds: config.ROUNDS,
    questionsPerRound: config.QUESTIONS_PER_ROUND,
    currentRound: 1,
    currentQuestionIndex: 0,
    allowedTimeSeconds: config.TIME_PER_QUESTION[0],
    question: publicImage(firstImage),
  });
});

// GET /api/test/:sessionId  (resume / poll current state)
const getSession = asyncHandler(async (req, res) => {
  const session = await TestSession.findOne({ sessionId: req.params.sessionId });
  if (!session) return res.status(404).json({ message: 'Test session not found.' });

  const guestToken = req.headers['x-guest-token'] || null;
  const owned = await isSessionOwnedBy(session, req.user, guestToken);
  if (!owned) return res.status(403).json({ message: 'Not authorized for this test session.' });

  if (session.status !== 'in_progress') {
    return res.json({ sessionId: session.sessionId, status: session.status });
  }

  const images = await IshiharaImage.find({ _id: { $in: session.imageIds } });
  const imageMap = new Map(images.map((i) => [String(i._id), i]));
  const orderedImages = session.imageIds.map((id) => imageMap.get(String(id)));

  const currentImage = orderedImages[session.currentQuestionIndex];

  // refresh the timer anchor on resume so a refresh doesn't grant free time,
  // but doesn't unfairly penalize either -> we simply restart this question's timer
  session.currentQuestionServedAt = new Date();
  await session.save();

  res.json({
    sessionId: session.sessionId,
    status: session.status,
    totalRounds: config.ROUNDS,
    questionsPerRound: config.QUESTIONS_PER_ROUND,
    currentRound: session.currentRound,
    currentQuestionIndex: session.currentQuestionIndex,
    allowedTimeSeconds: config.TIME_PER_QUESTION[session.currentRound - 1],
    question: publicImage(currentImage),
  });
});

// POST /api/test/:sessionId/answer
const submitAnswer = asyncHandler(async (req, res) => {
  const session = await TestSession.findOne({ sessionId: req.params.sessionId });
  if (!session) return res.status(404).json({ message: 'Test session not found.' });

  const guestToken = req.headers['x-guest-token'] || null;
  const owned = await isSessionOwnedBy(session, req.user, guestToken);
  if (!owned) return res.status(403).json({ message: 'Not authorized for this test session.' });

  if (session.status !== 'in_progress') {
    return res.status(409).json({ message: 'This test session is not in progress.' });
  }

  const { answer, isSkip } = req.body;

  const images = await IshiharaImage.find({ _id: { $in: session.imageIds } });
  const imageMap = new Map(images.map((i) => [String(i._id), i]));
  const orderedImages = session.imageIds.map((id) => imageMap.get(String(id)));
  const currentImage = orderedImages[session.currentQuestionIndex];

  const allowedTimeSeconds = config.TIME_PER_QUESTION[session.currentRound - 1];
  const servedAt = session.currentQuestionServedAt || session.startTime;
  const elapsedMs = Date.now() - new Date(servedAt).getTime();

  // Server-side timeout enforcement: cannot answer after allotted time
  // (small grace buffer for network latency)
  const GRACE_MS = 800;
  const isTimeout = elapsedMs > allowedTimeSeconds * 1000 + GRACE_MS;

  let givenAnswer = null;
  let isCorrect = false;
  let isSkipped = false;

  if (isTimeout) {
    isCorrect = false;
  } else if (isSkip) {
    isSkipped = true;
    isCorrect = false;
  } else {
    givenAnswer = typeof answer === 'string' ? answer.trim() : String(answer ?? '').trim();
    isCorrect = givenAnswer.toLowerCase() === String(currentImage.correctAnswer).trim().toLowerCase();
  }

  await TestAnswer.create({
    session: session._id,
    round: session.currentRound,
    questionIndex: session.currentQuestionIndex,
    image: currentImage._id,
    givenAnswer,
    correctAnswer: currentImage.correctAnswer,
    category: currentImage.category,
    isCorrect,
    isTimeout,
    isSkipped,
    responseTimeMs: isTimeout ? null : elapsedMs,
    allowedTimeSeconds,
  });

  // Advance pointer
  let nextRound = session.currentRound;
  let nextIndex = session.currentQuestionIndex + 1;
  let finishedRound = false;

  if (nextIndex >= config.QUESTIONS_PER_ROUND) {
    finishedRound = true;
    nextIndex = 0;
    nextRound += 1;
  }

  const testComplete = nextRound > config.ROUNDS;

  if (testComplete) {
    session.status = 'completed';
    session.completedTime = new Date();
    await session.save();
    return res.json({
      isCorrect,
      isTimeout,
      isSkipped,
      testComplete: true,
    });
  }

  session.currentRound = nextRound;
  session.currentQuestionIndex = nextIndex;
  session.currentQuestionServedAt = new Date();
  await session.save();

  const nextImage = orderedImages[nextIndex];

  res.json({
    isCorrect,
    isTimeout,
    isSkipped,
    testComplete: false,
    finishedRound,
    nextQuestion: {
      currentRound: session.currentRound,
      currentQuestionIndex: session.currentQuestionIndex,
      allowedTimeSeconds: config.TIME_PER_QUESTION[session.currentRound - 1],
      question: publicImage(nextImage),
    },
  });
});

module.exports = { startTest, getSession, submitAnswer };
