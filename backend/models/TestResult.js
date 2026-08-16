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

const categoryBreakdownSchema = new mongoose.Schema(
  {
    category: String,
    incorrectCount: Number,
    shareOfIncorrect: Number,
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestToken: { type: String, default: null, index: true },

    shareToken: { type: String, default: uuidv4, unique: true, index: true },

    totalQuestions: Number,
    correctCount: Number,
    incorrectCount: Number,
    timeoutCount: Number,
    overallAccuracy: Number, // 0..1

    roundStats: [roundStatSchema],
    categoryBreakdown: [categoryBreakdownSchema],

    screeningStatus: {
      type: String,
      enum: ['normal', 'borderline', 'possible_deficiency'],
      required: true,
    },
    probableCategory: { type: String, default: null },
    confidence: { type: String, enum: ['low', 'moderate', 'high', null], default: null },
    explanation: { type: String, required: true },
    disclaimer: { type: String, required: true },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TestResult', testResultSchema);
