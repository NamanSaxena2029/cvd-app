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
  // classification_tracing plates require a line-tracing response, which the
  // current text-answer UI does not support -- excluded from selection until
  // that response type is built (see PLATE_TYPES note in testConfig.js).
  const [screeningPlates, otherPlates] = await Promise.all([
    IshiharaImage.find({ active: true, plateType: { $in: SCREENING_TYPES } }).lean(),
    IshiharaImage.find({
      active: true,
      plateType: { $nin: [...SCREENING_TYPES, 'classification_tracing'] },
    }).lean(),
  ]);

  const pool = [...shuffle(screeningPlates), ...shuffle(otherPlates)];

  const selected = [];
  const target = config.TOTAL_QUESTIONS;

  // First pass: distinct plates, screening types first
  for (const plate of pool) {
    if (selected.length >= target) break;
    selected.push(plate);
  }

  // Only if there still aren't enough DISTINCT active plates do we repeat,
  // and we shuffle each additional pass so repeats aren't clustered.
  let cursor = 0;
  while (selected.length < target && pool.length > 0) {
    selected.push(pool[cursor % pool.length]);
    cursor += 1;
  }

  return shuffle(selected.slice(0, target));
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