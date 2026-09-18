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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks up to TOTAL_QUESTIONS distinct active plates for a whole session
 * (all 3 rounds), prioritizing genuine screening-type plates (transformation
 * / vanishing / hidden_digit -- these are what Ishihara's own scoring rule
 * is based on) before drawing on diagnostic or other active plates. Plates
 * are only repeated across the session if there are not enough distinct
 * active plates to fill all 30 slots -- this replaces the previous
 * behaviour of showing the exact same 10 plates three times in a row.
 */
async function pickPlatesForSession() {
  const activeCount = await IshiharaImage.countDocuments({ active: true });
  if (activeCount < config.MIN_ACTIVE_IMAGES_REQUIRED) {
    throw new TestError(
      `Not enough active Ishihara plates to start a test (need ${config.MIN_ACTIVE_IMAGES_REQUIRED}, ` +
        `have ${activeCount}). See DATASET_LICENSE.md -- authentic plate images likely still need ` +
        `to be added and activated by an admin.`,
      409
    );
  }

  const SCREENING_TYPES = ['transformation', 'vanishing', 'hidden_digit'];
  const [screeningPlates, otherPlates] = await Promise.all([
    IshiharaImage.find({ active: true, plateType: { $in: SCREENING_TYPES } }).lean(),
    IshiharaImage.find({
      active: true,
      plateType: { $nin: [...SCREENING_TYPES, 'classification_tracing'] },
    }).lean(),
  ]);

  const allPlates = [...screeningPlates, ...otherPlates];
  const vanishingPool = shuffle(allPlates.filter((p) => p.plateType === 'vanishing'));
  const restPool = shuffle(allPlates.filter((p) => p.plateType !== 'vanishing'));

  const rounds = [];
  let vCursor = 0;
  let rCursor = 0;

  for (let round = 0; round < config.ROUNDS; round++) {
    const roundPlates = [];
    let vanishingUsed = 0;

    while (roundPlates.length < config.QUESTIONS_PER_ROUND) {
      const takeVanishing =
        vanishingUsed < config.MAX_VANISHING_PER_ROUND &&
        vanishingPool.length > 0 &&
        roundPlates.length % 4 === 3; // roughly 1-in-4 slot, capped

      if (takeVanishing) {
        roundPlates.push(vanishingPool[vCursor % vanishingPool.length]);
        vCursor += 1;
        vanishingUsed += 1;
      } else if (restPool.length > 0) {
        roundPlates.push(restPool[rCursor % restPool.length]);
        rCursor += 1;
      } else {
        roundPlates.push(vanishingPool[vCursor % vanishingPool.length]);
        vCursor += 1;
        vanishingUsed += 1;
      }
    }

    rounds.push(shuffle(roundPlates));
  }

  return rounds.flat();
}

function getServedQuestion(session, images) {
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