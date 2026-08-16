const config = require('../config/testConfig');

/**
 * Analyzes a completed test's answers and produces a preliminary,
 * non-clinical screening result.
 *
 * @param {Array} answers - array of TestAnswer-like objects:
 *   { round, isCorrect, isTimeout, category }
 * @returns {object} screening result summary
 */
function analyzeScreening(answers) {
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const timeout = answers.filter((a) => a.isTimeout).length;
  const incorrect = total - correct;

  const overallAccuracy = total > 0 ? correct / total : 0;

  // Round-wise stats
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

  // Category breakdown of INCORRECT (including timeout) answers only,
  // since correct answers don't inform a deficiency pattern.
  const wrongAnswers = answers.filter((a) => !a.isCorrect);
  const categoryCounts = {};
  wrongAnswers.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  const totalWrong = wrongAnswers.length;
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, incorrectCount]) => ({
      category,
      incorrectCount,
      shareOfIncorrect: totalWrong > 0 ? incorrectCount / totalWrong : 0,
    }))
    .sort((a, b) => b.incorrectCount - a.incorrectCount);

  // Determine screening status from configured thresholds
  const { NORMAL_MIN_ACCURACY, BORDERLINE_MIN_ACCURACY, CATEGORY_MIN_INCORRECT_SHARE } =
    config.SCREENING_THRESHOLDS;

  let screeningStatus;
  if (overallAccuracy >= NORMAL_MIN_ACCURACY) {
    screeningStatus = 'normal';
  } else if (overallAccuracy >= BORDERLINE_MIN_ACCURACY) {
    screeningStatus = 'borderline';
  } else {
    screeningStatus = 'possible_deficiency';
  }

  // Determine probable category only if one category dominates the
  // wrong answers AND the "normal" category is excluded from consideration
  // AND we actually have enough wrong answers to say anything meaningful.
  let probableCategory = null;
  let confidence = null;

  const nonNormalBreakdown = categoryBreakdown.filter((c) => c.category !== 'normal');
  if (screeningStatus !== 'normal' && nonNormalBreakdown.length > 0 && totalWrong >= 3) {
    const top = nonNormalBreakdown[0];
    if (top.shareOfIncorrect >= CATEGORY_MIN_INCORRECT_SHARE) {
      probableCategory = top.category;
      confidence =
        top.shareOfIncorrect >= 0.75 ? 'high' : top.shareOfIncorrect >= 0.6 ? 'moderate' : 'low';
    }
  }

  const explanation = buildExplanation(screeningStatus, probableCategory, overallAccuracy);

  return {
    totalQuestions: total,
    correctCount: correct,
    incorrectCount: incorrect,
    timeoutCount: timeout,
    overallAccuracy,
    roundStats,
    categoryBreakdown,
    screeningStatus,
    probableCategory,
    confidence,
    explanation,
    disclaimer: config.DISCLAIMER,
  };
}

function buildExplanation(status, probableCategory, accuracy) {
  const pct = Math.round(accuracy * 100);

  if (status === 'normal') {
    return `Preliminary screening indicates a normal-range result (${pct}% accuracy). No strong pattern of color vision deficiency was detected in this session.`;
  }

  if (status === 'borderline') {
    return `Preliminary screening result is borderline (${pct}% accuracy). This does not confirm a color vision deficiency, but a follow-up test or professional evaluation is recommended.`;
  }

  // possible_deficiency
  const categoryLabel = probableCategory
    ? config.CATEGORIES.find((c) => c.key === probableCategory)?.label || probableCategory
    : null;

  if (categoryLabel) {
    return `Preliminary screening indicates a possible color vision deficiency (${pct}% accuracy). The pattern of incorrect responses may be associated with the "${categoryLabel}" category. Professional testing is recommended for confirmation. This is not a medical diagnosis.`;
  }

  return `Preliminary screening indicates a possible color vision deficiency (${pct}% accuracy), though no single category clearly dominated the incorrect responses. Professional testing is recommended for confirmation. This is not a medical diagnosis.`;
}

module.exports = { analyzeScreening };
