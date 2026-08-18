const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roundStatSchema = new mongoose.Schema(
  {
    round: Number,
    correct: Number,
    incorrect: Number,
    timeout: Number,
    total: Number,
    accuracy: Number,
  },
  { _id: false }
);

// (categoryBreakdown was removed -- Ishihara only differentiates red-green
// deficiency + total colour blindness; the old blue_yellow/total buckets in
// the previous version of this app were not part of the verified test data.)

const subtypeSchema = new mongoose.Schema(
  { label: String, confidence: { type: String, enum: ['low', 'high', null], default: null } },
  { _id: false }
);

const officialScreeningSchema = new mongoose.Schema(
  {
    presentedCount: Number,
    fullOfficialSetSize: Number,
    normalReadCount: Number,
    status: {
      type: String,
      enum: ['normal_range', 'borderline', 'deficient_range', 'insufficient_data'],
      required: true,
    },
    subtype: subtypeSchema,
    note: String,
    scoringRuleSource: String,
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestToken: { type: String, default: null, index: true },

    shareToken: { type: String, default: uuidv4, unique: true, index: true },

    // ---- This app's own "project experiment" metrics (3 rounds, decreasing
    // timers, aggregate accuracy). NOT the standardized Ishihara procedure. ----
    totalQuestions: Number,
    correctCount: Number,
    incorrectCount: Number,
    timeoutCount: Number,
    overallAccuracy: Number, // 0..1
    roundStats: [roundStatSchema],

    // ---- Result based on Ishihara's own published scoring rule, applied to
    // whichever of the official numeral screening plates were presented ----
    officialScreening: { type: officialScreeningSchema, required: true },

    // Kept for backward-compatible display; mirrors officialScreening.status
    screeningStatus: {
      type: String,
      enum: ['normal_range', 'borderline', 'deficient_range', 'insufficient_data'],
      required: true,
    },
    explanation: { type: String, required: true },
    disclaimer: { type: String, required: true },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TestResult', testResultSchema);