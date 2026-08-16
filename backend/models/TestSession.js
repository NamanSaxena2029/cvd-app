const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const testSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: uuidv4, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = guest
    guestToken: { type: String, default: null, index: true }, // used to identify guest ownership

    // The 10 plate IDs selected at test start; reused across all 3 rounds.
    imageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IshiharaImage' }],

    currentRound: { type: Number, default: 1 }, // 1..3
    currentQuestionIndex: { type: Number, default: 0 }, // 0..9 within round

    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
    },

    startTime: { type: Date, default: Date.now },
    completedTime: { type: Date, default: null },

    // per-question timing anchor, set server-side each time a question is served
    currentQuestionServedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TestSession', testSessionSchema);
