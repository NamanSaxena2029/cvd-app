module.exports = {
  ROUNDS: 3,
  QUESTIONS_PER_ROUND: 10,
  TOTAL_QUESTIONS: 30,
  TIME_PER_QUESTION: [10, 7, 5], // seconds allowed per question, per round (index 0 = round 1)
  MIN_ACTIVE_IMAGES_REQUIRED: 10,

  CATEGORIES: [
    { key: 'demonstration', label: 'Demonstration (not scored)' },
    { key: 'red_green', label: 'Red-Green Deficiency Indicator' },
    { key: 'total_color_deficiency', label: 'Total Colour Blindness/Weakness Indicator' },
    { key: 'classification_tracing', label: 'Classification / Tracing Plate (non-numeral)' },
  ],

  PLATE_TYPES: [
    'demonstration',
    'transformation',
    'vanishing',
    'hidden_digit',
    'diagnostic',
    'classification_tracing',
  ],

  OFFICIAL_SCORING: {
    SCREENING_PLATE_RANGE: { from: 2, to: 21 }, // 20 numeral plates, excludes demonstration plate 1
    NORMAL_MIN_CORRECT: 17,
    DEFICIENT_MAX_CORRECT: 13,
    DIAGNOSTIC_PLATE_RANGE: { from: 22, to: 25 }, // protan/deutan subtype differentiation
    SOURCE:
      "Shinobu Ishihara, 'The Series of Plates Designed as a Test for Colour Deficiency' " +
      '(38 Plates Edition), Kanehara Trading Inc., Tokyo -- official instruction manual.',
  },

  DISCLAIMER:
    "This application's plate images and answer key are (or will be, once a licensed dataset " +
    "is installed -- see DATASET_LICENSE.md) based on the authentic Ishihara test. However, a " +
    'web-based screening cannot fully reproduce the standardized clinical testing environment ' +
    '(controlled daylight illumination, calibrated printed plates, in-person administration). ' +
    'This is a preliminary, non-clinical screening tool, not a medical diagnosis. For a ' +
    'definitive assessment, please consult a qualified eye-care professional.',

  DISPLAY_GUIDANCE: [
    'Use a normal screen brightness setting.',
    'Avoid night mode / dark mode colour shifting.',
    'Disable blue-light filters (f.lux, Night Shift, etc.).',
    'Disable any browser extensions or OS accessibility filters that modify on-screen colour.',
    'Do not change display settings during the test.',
    'View the screen straight-on, not at an angle.',
    'Use a reasonably colour-calibrated display where possible.',
  ],
};