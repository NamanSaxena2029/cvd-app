const mongoose = require('mongoose');

const testAnswerSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession', required: true, index: true },
    round: { type: Number, required: true },
    questionIndex: { type: Number, required: true }, // 0..9
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'IshiharaImage', required: true },

    givenAnswer: { type: String, default: null }, // null if timeout

    normalVisionResponseSnapshot: { type: String, default: null },
    category: { type: String, required: true },

    isCorrect: { type: Boolean, required: true },
    isTimeout: { type: Boolean, default: false },
    isSkipped: { type: Boolean, default: false },

    responseTimeMs: { type: Number, default: null },
    allowedTimeSeconds: { type: Number, required: true },
  },
  { timestamps: true }
);

testAnswerSchema.index({ session: 1, round: 1, questionIndex: 1 }, { unique: true });

module.exports = mongoose.model('TestAnswer', testAnswerSchema);