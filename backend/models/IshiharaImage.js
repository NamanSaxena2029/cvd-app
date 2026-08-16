const mongoose = require('mongoose');

const ishiharaImageSchema = new mongoose.Schema(
  {
    imageId: { type: String, required: true, unique: true, trim: true, index: true },
    imageUrl: { type: String, required: true },
    correctAnswer: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    active: { type: Boolean, default: true, index: true },
    isSample: { type: Boolean, default: false }, // marks seed/placeholder plates
  },
  { timestamps: true }
);

module.exports = mongoose.model('IshiharaImage', ishiharaImageSchema);
