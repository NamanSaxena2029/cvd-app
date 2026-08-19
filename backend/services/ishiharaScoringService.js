const config = require('../config/testConfig');

/**
 * @param {{givenAnswer: string|null, isSkipped: boolean}} response
 * @param {object} plate - an IshiharaImage document/plain object
 * @returns {boolean}
 */

function readNormally(response, plate) {
  if (!plate) return false;

  if (plate.plateType === 'hidden_digit') {
    const given = (response.givenAnswer ?? '').toString().trim();
    return response.isSkipped || given === '';
  }

  if (response.isSkipped) return false;

  const expected = plate.normalVisionResponse;
  if (expected == null) return false; // unverified plate -- never silently "correct"

  const given = (response.givenAnswer ?? '').toString().trim();
  if (given === '') return false;

  return normalize(given) === normalize(expected);
}

function normalize(v) {
  return v.toString().trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Whole-session scoring
// ---------------------------------------------------------------------------

/**
 * @param {Array<{
 *   round: number,
 *   givenAnswer: string|null,
 *   isSkipped: boolean,
 *   isTimeout: boolean,
 *   isCorrect: boolean,           // from readNormally(), stored per-answer
 *   plate: object,                // populated IshiharaImage doc
 * }>} answers
 */
function scoreSession(answers) {
  const officialScreening = scoreOfficialIshihara(answers);
  const projectExperiment = scoreProjectExperiment(answers);

  return {
    officialScreening,
    projectExperiment,
    disclaimer: config.DISCLAIMER,
  };
}

function scoreOfficialIshihara(answers) {
  const { from, to } = config.OFFICIAL_SCORING.SCREENING_PLATE_RANGE;

  const screeningAnswers = answers.filter(
    (a) => a.plate && a.plate.plateNumber >= from && a.plate.plateNumber <= to
  );

  const presentedCount = screeningAnswers.length;
  const fullOfficialSetSize = to - from + 1;

  // Not enough of the official screening plates were shown in this session
  // (e.g. dataset is still incomplete) -- do not fabricate a result.
  const MIN_PRESENTED_FOR_RESULT = Math.min(10, fullOfficialSetSize);
  if (presentedCount < MIN_PRESENTED_FOR_RESULT) {
    return {
      presentedCount,
      fullOfficialSetSize,
      normalReadCount: null,
      status: 'insufficient_data',
      subtype: null,
      note:
        `Only ${presentedCount} of the ${fullOfficialSetSize} official numeral screening plates ` +
        `(plates ${from}-${to}) were available/presented in this session.`,
      scoringRuleSource: config.OFFICIAL_SCORING.SOURCE,
    };
  }

  const normalReadCount = screeningAnswers.filter((a) => a.isCorrect).length;

  // Scale the published 17/13 thresholds (defined for the full 20-plate set)
  // to however many of those plates were actually presented, in case the
  // dataset does not yet cover all 20.
  const scale = presentedCount / fullOfficialSetSize;
  const normalThreshold = Math.round(config.OFFICIAL_SCORING.NORMAL_MIN_CORRECT * scale);
  const deficientThreshold = Math.floor(config.OFFICIAL_SCORING.DEFICIENT_MAX_CORRECT * scale);

  let status;
  if (normalReadCount >= normalThreshold) {
    status = 'normal_range';
  } else if (normalReadCount <= deficientThreshold) {
    status = 'deficient_range';
  } else {
    status = 'borderline';
  }

  const note =
    presentedCount === fullOfficialSetSize
      ? `${normalReadCount} of ${presentedCount} plates read normally ` +
        `(normal range: ${config.OFFICIAL_SCORING.NORMAL_MIN_CORRECT}+, deficient range: ` +
        `${config.OFFICIAL_SCORING.DEFICIENT_MAX_CORRECT} or fewer, per the published scoring rule).`
      : `${normalReadCount} of ${presentedCount} presented plates read normally. Thresholds were ` +
        `scaled down from the published 17/13 (out of ${fullOfficialSetSize}) rule because not all ` +
        `${fullOfficialSetSize} official screening plates are currently in the active dataset -- ` +
        `treat this result with extra caution.`;

  let subtype = null;
  if (status === 'deficient_range' || status === 'borderline') {
    subtype = estimateSubtype(answers);
  }

  return {
    presentedCount,
    fullOfficialSetSize,
    normalReadCount,
    status,
    subtype,
    note,
    scoringRuleSource: config.OFFICIAL_SCORING.SOURCE,
  };
}

/**
 * Protan/deutan subtype estimate using the diagnostic plates (22-25 in the
 * 38-plate edition), per config.OFFICIAL_SCORING.DIAGNOSTIC_PLATE_RANGE.
 * Only returns a subtype when the presented diagnostic plates actually
 * carry verified protanResponse/deutanResponse metadata -- otherwise
 * explicitly reports that a subtype could not be estimated.
 */
function estimateSubtype(answers) {
  const { from, to } = config.OFFICIAL_SCORING.DIAGNOSTIC_PLATE_RANGE;
  const diagnosticAnswers = answers.filter(
    (a) => a.plate && a.plate.plateNumber >= from && a.plate.plateNumber <= to
  );

  const usable = diagnosticAnswers.filter(
    (a) => a.plate.protanResponse != null && a.plate.deutanResponse != null
  );

  if (usable.length === 0) {
    return { label: null, confidence: null, note: 'Subtype could not be reliably estimated.' };
  }

  let protanMatches = 0;
  let deutanMatches = 0;
  usable.forEach((a) => {
    const given = (a.givenAnswer ?? '').toString().trim().toLowerCase();
    if (given === '') return;
    if (given === a.plate.protanResponse.toString().trim().toLowerCase()) protanMatches += 1;
    if (given === a.plate.deutanResponse.toString().trim().toLowerCase()) deutanMatches += 1;
  });

  if (protanMatches === 0 && deutanMatches === 0) {
    return { label: null, confidence: null, note: 'Subtype could not be reliably estimated.' };
  }

  if (protanMatches > deutanMatches) {
    return {
      label: 'Protan-type pattern',
      confidence: protanMatches >= usable.length ? 'high' : 'low',
      note: `${protanMatches} of ${usable.length} diagnostic plates matched a protan-type reading.`,
    };
  }
  if (deutanMatches > protanMatches) {
    return {
      label: 'Deutan-type pattern',
      confidence: deutanMatches >= usable.length ? 'high' : 'low',
      note: `${deutanMatches} of ${usable.length} diagnostic plates matched a deutan-type reading.`,
    };
  }
  return { label: null, confidence: null, note: 'Subtype could not be reliably estimated.' };
}

function scoreProjectExperiment(answers) {
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const timeout = answers.filter((a) => a.isTimeout).length;
  const incorrect = total - correct;

  const roundStats = [];
  for (let r = 1; r <= config.ROUNDS; r++) {
    const roundAnswers = answers.filter((a) => a.round === r);
    const roundCorrect = roundAnswers.filter((a) => a.isCorrect).length;
    const roundTimeout = roundAnswers.filter((a) => a.isTimeout).length;
    const roundTotal = roundAnswers.length;
    roundStats.push({
      round: r,
      correct: roundCorrect,
      incorrect: roundTotal - roundCorrect,
      timeout: roundTimeout,
      total: roundTotal,
      accuracy: roundTotal > 0 ? roundCorrect / roundTotal : 0,
    });
  }

  return {
    totalQuestions: total,
    correctCount: correct,
    incorrectCount: incorrect,
    timeoutCount: timeout,
    overallAccuracy: total > 0 ? correct / total : 0,
    roundStats,
  };
}

module.exports = { readNormally, scoreSession };