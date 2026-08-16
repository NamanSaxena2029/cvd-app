/**
 * Central configuration for the Ishihara screening test.
 * Everything tunable about the test (timers, round counts, thresholds,
 * category labels) lives here so it is not scattered across the codebase.
 *
 * IMPORTANT: The thresholds/categories below are PROJECT-IMPLEMENTED
 * screening logic, not a clinically validated diagnostic standard.
 */

module.exports = {
  ROUNDS: 3,
  QUESTIONS_PER_ROUND: 10,
  TOTAL_QUESTIONS: 30,

  // Seconds allowed per question, per round (index 0 = round 1)
  TIME_PER_QUESTION: [10, 7, 5],

  // Minimum number of ACTIVE images required in the DB to run a test
  MIN_ACTIVE_IMAGES_REQUIRED: 10,

  // Screening categories that an image can belong to.
  // Configurable here instead of being hard-coded across the frontend.
  CATEGORIES: [
    { key: 'normal', label: 'Normal Vision Indicator' },
    { key: 'red_green', label: 'Red-Green Deficiency Indicator' },
    { key: 'blue_yellow', label: 'Blue-Yellow Deficiency Indicator' },
    { key: 'total', label: 'Total Color Vision Deficiency Indicator' },
  ],

  // Screening decision thresholds (project-defined, documented in README).
  // accuracy = correct / total attempted (excluding overall total questions if 0 attempted)
  SCREENING_THRESHOLDS: {
    NORMAL_MIN_ACCURACY: 0.75, // >= this accuracy => normal-range result
    BORDERLINE_MIN_ACCURACY: 0.55, // between borderline and normal => borderline
    // below BORDERLINE_MIN_ACCURACY => possible deficiency
    CATEGORY_MIN_INCORRECT_SHARE: 0.5, // a category must account for >=50% of wrong answers to be "probable"
  },

  DISCLAIMER:
    'This application provides a preliminary, non-clinical screening based on the Ishihara-style test pattern. ' +
    'It is not a medical diagnosis. For professional evaluation, please consult a qualified eye-care professional.',
};
