const IshiharaImage = require('../models/IshiharaImage');
const TestSession = require('../models/TestSession');
const TestAnswer = require('../models/TestAnswer');
const config = require('../config/testConfig');

class TestError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Randomly picks QUESTIONS_PER_ROUND active images, used across all 3 rounds.
async function pickPlatesForSession() {
  const activeCount = await IshiharaImage.countDocuments({ active: true });
  if (activeCount < config.MIN_ACTIVE_IMAGES_REQUIRED) {
    throw new TestError(
      `Not enough active Ishihara images to start a test (need ${config.MIN_ACTIVE_IMAGES_REQUIRED}, have ${activeCount}).`,
      409
    );
  }

  const images = await IshiharaImage.aggregate([
    { $match: { active: true } },
    { $sample: { size: config.QUESTIONS_PER_ROUND } },
  ]);
  return images;
}

function getServedQuestion(session, images) {
  // images ordered same as session.imageIds; round order is the same set,
  // question order can be shuffled per round using a deterministic-ish reshuffle
  const idx = session.currentQuestionIndex;
  const image = images[idx];
  const allowedTimeSeconds = config.TIME_PER_QUESTION[session.currentRound - 1];
  return { image, allowedTimeSeconds };
}

async function isSessionOwnedBy(session, user, guestToken) {
  if (session.user) {
    return user && String(session.user) === String(user._id);
  }
  return guestToken && session.guestToken === guestToken;
}

async function getSessionProgress(sessionId) {
  const totalAnswered = await TestAnswer.countDocuments({ session: sessionId });
  return totalAnswered;
}

module.exports = {
  TestError,
  pickPlatesForSession,
  getServedQuestion,
  isSessionOwnedBy,
  getSessionProgress,
};
